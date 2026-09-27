import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  WeightHeightRecord,
  WeightHeightRow,
  Student,
  TeacherProfile,
  GradeLevel
} from '../types';
import { dataService } from '../services/dataService';
import { formatThaiDate, calculateBMI } from '../utils/helpers';
import { PrintReportModal } from '../components/PrintReportModal';
import { CopyAllStudentsModal } from '../components/CopyAllStudentsModal';
import {
  Activity,
  Plus,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Save,
  Printer,
  Download,
  CheckCircle2,
  Users,
  ChevronDown,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Copy,
  Camera,
  UploadCloud,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileSpreadsheet,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

interface WeightHeightViewProps {
  isAdmin: boolean;
}

const ALL_GRADES: GradeLevel[] = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

// ฟังก์ชันบีบอัดรูปภาพให้คมชัดแต่ขนาดพอดีสำหรับจัดเก็บในระบบ
const compressImage = async (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const extractGradeFromClassroom = (classroomName?: string): GradeLevel => {
  if (!classroomName) return 'ป.1';
  const match = classroomName.match(/ป\.?\s*([1-6])/) || classroomName.match(/([1-6])/);
  if (match && match[1]) {
    return `ป.${match[1]}` as GradeLevel;
  }
  return 'ป.1';
};

const createRowsForGrade = (grade: GradeLevel, allStudents: Student[]): WeightHeightRow[] => {
  const gradeStudents = allStudents.filter((s) => s.gradeLevel === grade);
  const studentsToUse = gradeStudents.length > 0 ? gradeStudents : allStudents;
  // ตามจำนวนจริงของแต่ละชั้นที่เลือก โดยไม่มีการเติมแถวว่าง
  const rowsCount = studentsToUse.length;
  const rows: WeightHeightRow[] = [];

  for (let i = 0; i < rowsCount; i++) {
    const student = studentsToUse[i];
    let initialGender: 'ชาย' | 'หญิง' | undefined = undefined;
    if (student) {
      if (student.prefix === 'เด็กชาย' || student.prefix === 'นาย' || student.gender === 'male') {
        initialGender = 'ชาย';
      } else if (student.prefix === 'เด็กหญิง' || student.prefix === 'นางสาว' || student.gender === 'female') {
        initialGender = 'หญิง';
      }
    }

    rows.push({
      id: `row-${Date.now()}-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
      order: i + 1,
      studentId: student?.id,
      studentName: student ? `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim() : '',
      gender: initialGender,
      age: student ? student.age : '',
      weight: '',
      height: '',
      bmi: undefined,
      status: undefined,
    });
  }
  return rows;
};

export const WeightHeightView: React.FC<WeightHeightViewProps> = ({ isAdmin }) => {
  const [records, setRecords] = useState<WeightHeightRecord[]>(dataService.getWeightHeightRecords());
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());

  // Active record editor state
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('ป.1');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTerm, setSelectedTerm] = useState<'1' | '2'>('1');
  const [recordNote, setRecordNote] = useState('');
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<WeightHeightRow[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // View / Print Modal state
  const [printRecord, setPrintRecord] = useState<WeightHeightRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<WeightHeightRecord | null>(null);

  // Filter list by grade level (ป.1 - ป.6)
  const [listGradeFilter, setListGradeFilter] = useState<'all' | GradeLevel>('all');

  // Choice Modal State: เลือกว่าจะกรอก หรือ อัปโหลดภาพ
  const [showAddChoiceModal, setShowAddChoiceModal] = useState(false);
  const [targetChoiceGrade, setTargetChoiceGrade] = useState<GradeLevel | undefined>(undefined);

  // Upload Photo Modal State: อัปโหลดภาพกระดาษตาราง
  const [showUploadPhotoModal, setShowUploadPhotoModal] = useState(false);
  const [photoGrade, setPhotoGrade] = useState<GradeLevel>('ป.1');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoTerm, setPhotoTerm] = useState<'1' | '2'>('1');
  const [photoYear, setPhotoYear] = useState('2569');
  const [photoNote, setPhotoNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Full Screen Photo Viewer Modal State (เน้นกดไอคอนตาต้องแสดงภาพที่อัปโหลดเท่านั้น)
  const [viewPhotoRecord, setViewPhotoRecord] = useState<WeightHeightRecord | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Modal สำหรับคัดลอกรายชื่อนักเรียนทั้งหมดตามชั้นเพื่อแทนที่ข้อมูลเดิมทันที
  const [showCopyAllStudentsModal, setShowCopyAllStudentsModal] = useState(false);

  // นำรายชื่อที่คัดลอกมาแทนที่ข้อมูลเดิมทันทีตามจำนวนจริงของชั้นที่เลือก
  const handleApplyStudentsFromCopy = (selectedStudents: Student[], gradeLabel: string) => {
    const targetGrade = (selectedStudents[0]?.gradeLevel as GradeLevel) || selectedGrade;
    const newRows: WeightHeightRow[] = selectedStudents.map((student, idx) => {
      let initialGender: 'ชาย' | 'หญิง' | undefined = undefined;
      if (student.prefix === 'เด็กชาย' || student.prefix === 'นาย' || student.gender === 'male') {
        initialGender = 'ชาย';
      } else if (student.prefix === 'เด็กหญิง' || student.prefix === 'นางสาว' || student.gender === 'female') {
        initialGender = 'หญิง';
      }
      return {
        id: `row-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
        order: idx + 1,
        studentId: student.id,
        studentName: `${student.prefix || ''}${student.firstName} ${student.lastName}`.trim(),
        gender: initialGender,
        age: student.age || '',
        weight: '',
        height: '',
        bmi: undefined,
        status: undefined,
      };
    });

    setTableRows(newRows);
    setSelectedGrade(targetGrade);
    triggerAutoSave(newRows, targetGrade);
    dataService.notifyToast(
      'success',
      'คัดลอกรายชื่อสำเร็จ',
      `คัดลอกรายชื่อนักเรียนชั้น ${gradeLabel} (${newRows.length} คน) เรียบร้อยแล้ว`
    );
    setShowCopyAllStudentsModal(false);
  };

  // Mobile / Pop-up Full Screen Modal State for Student Data Entry (Req: เมื่อกดชื่อ จะแสดงpop-up ให้ลงคะแนน/น้ำหนักส่วนสูงให้เรียบร้อย ลงเสร็จก็กดบันทึก)
  const [whModalIndex, setWhModalIndex] = useState<number | null>(null);
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalGender, setModalGender] = useState<'ชาย' | 'หญิง' | undefined>(undefined);
  const [modalAge, setModalAge] = useState<number | ''>('');
  const [modalWeight, setModalWeight] = useState<number | ''>('');
  const [modalHeight, setModalHeight] = useState<number | ''>('');

  const handleOpenWHModal = (index: number) => {
    const row = tableRows[index];
    if (!row) return;
    setWhModalIndex(index);
    setModalStudentName(row.studentName || '');
    setModalGender(row.gender);
    setModalAge(row.age !== undefined ? row.age : '');
    setModalWeight(row.weight !== undefined ? row.weight : '');
    setModalHeight(row.height !== undefined ? row.height : '');
  };

  const handleSaveWHModal = (closeAfter = true) => {
    if (whModalIndex === null) return;
    const updated = [...tableRows];
    const currentRow = { ...updated[whModalIndex] };
    currentRow.studentName = modalStudentName;
    currentRow.gender = modalGender;
    currentRow.age = modalAge;
    currentRow.weight = modalWeight;
    currentRow.height = modalHeight;

    if (typeof modalWeight === 'number' && typeof modalHeight === 'number' && modalHeight > 0) {
      const bmiResult = calculateBMI(
        modalWeight,
        modalHeight,
        modalGender,
        typeof modalAge === 'number' ? modalAge : undefined
      );
      currentRow.bmi = bmiResult.bmi;
      currentRow.status = bmiResult.status;
    } else {
      currentRow.bmi = undefined;
      currentRow.status = undefined;
    }

    updated[whModalIndex] = currentRow;
    setTableRows(updated);
    triggerAutoSave(updated);
    dataService.notifyToast(
      'success',
      'บันทึกสำเร็จ',
      `บันทึกข้อมูลของ ${modalStudentName || 'นักเรียน'} เรียบร้อย`
    );
    if (closeAfter) {
      setWhModalIndex(null);
    }
  };

  const handleNextStudentWHModal = () => {
    if (whModalIndex === null) return;
    handleSaveWHModal(false);
    if (whModalIndex < tableRows.length - 1) {
      const nextIdx = whModalIndex + 1;
      const nextRow = tableRows[nextIdx];
      if (nextRow) {
        setWhModalIndex(nextIdx);
        setModalStudentName(nextRow.studentName || '');
        setModalGender(nextRow.gender);
        setModalAge(nextRow.age !== undefined ? nextRow.age : '');
        setModalWeight(nextRow.weight !== undefined ? nextRow.weight : '');
        setModalHeight(nextRow.height !== undefined ? nextRow.height : '');
      }
    }
  };

  const handlePrevStudentWHModal = () => {
    if (whModalIndex === null) return;
    handleSaveWHModal(false);
    if (whModalIndex > 0) {
      const prevIdx = whModalIndex - 1;
      const prevRow = tableRows[prevIdx];
      if (prevRow) {
        setWhModalIndex(prevIdx);
        setModalStudentName(prevRow.studentName || '');
        setModalGender(prevRow.gender);
        setModalAge(prevRow.age !== undefined ? prevRow.age : '');
        setModalWeight(prevRow.weight !== undefined ? prevRow.weight : '');
        setModalHeight(prevRow.height !== undefined ? prevRow.height : '');
      }
    }
  };

  // เรียงลำดับวันที่เป็นปัจจุบันก่อนอยู่ด้านบน (descending)
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [records]);

  // รายการบันทึกที่กรองตามระดับชั้น
  const filteredRecords = useMemo(() => {
    if (listGradeFilter === 'all') return sortedRecords;
    return sortedRecords.filter((r) => {
      const recGrade = r.gradeLevel || extractGradeFromClassroom(profile.classroomName);
      return recGrade === listGradeFilter;
    });
  }, [sortedRecords, listGradeFilter, profile.classroomName]);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setRecords(dataService.getWeightHeightRecords());
      setStudents(dataService.getStudents());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  // เมื่อกดปุ่ม "+": เปิด Modal ให้เลือกว่าจะ "กรอก" หรือ "อัปโหลดภาพเพื่อเก็บ"
  const handleOpenAddChoice = (targetGrade?: GradeLevel) => {
    setTargetChoiceGrade(targetGrade);
    setShowAddChoiceModal(true);
  };

  const handleSelectFormEntry = () => {
    setShowAddChoiceModal(false);
    handleStartNewRecord(targetChoiceGrade);
  };

  const handleSelectPhotoUpload = () => {
    setShowAddChoiceModal(false);
    const initialGrade = targetChoiceGrade || (listGradeFilter !== 'all' ? listGradeFilter : extractGradeFromClassroom(profile.classroomName));
    setPhotoGrade(initialGrade);
    setPhotoDate(new Date().toISOString().slice(0, 10));
    setPhotoTerm('1');
    setPhotoYear(profile.academicYear || '2569');
    setPhotoNote('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowUploadPhotoModal(true);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      dataService.notifyToast('error', 'รูปแบบไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)');
      return;
    }
    setPhotoFile(file);
    try {
      const compressed = await compressImage(file, 1600, 1600, 0.85);
      setPhotoPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPhotoPreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhotoRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      dataService.notifyToast('warning', 'ยังไม่ได้เลือกรูปภาพ', 'กรุณาถ่ายรูปหรือเลือกรูปภาพกระดาษตารางก่อนบันทึก');
      return;
    }

    setIsSavingPhoto(true);
    try {
      const newRecord: WeightHeightRecord = {
        id: `wh-photo-${Date.now()}`,
        recordType: 'photo',
        imageUrl: photoPreview,
        imageFileName: photoFile?.name || `wh_photo_${photoDate}.jpg`,
        date: photoDate,
        gradeLevel: photoGrade,
        term: photoTerm,
        academicYear: photoYear || profile.academicYear || '2569',
        note: photoNote.trim() || 'ภาพถ่ายกระดาษตารางวัดน้ำหนักส่วนสูง',
        rows: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dataService.saveWeightHeightRecord(newRecord);
      setShowUploadPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      dataService.notifyToast(
        'success',
        'บันทึกภาพถ่ายตารางสำเร็จ',
        `บันทึกภาพถ่ายตารางน้ำหนัก-ส่วนสูง ชั้น ${photoGrade} เรียบร้อยแล้ว`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      dataService.notifyToast('error', 'บันทึกภาพไม่สำเร็จ', msg);
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDownloadPhoto = (dataUrl: string, fileName?: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName || `ตารางน้ำหนักส่วนสูง_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize a new record with students from selected grade
  const handleStartNewRecord = (targetGrade?: GradeLevel) => {
    const gradeToUse = targetGrade || (listGradeFilter !== 'all' ? listGradeFilter : extractGradeFromClassroom(profile.classroomName));
    setSelectedGrade(gradeToUse);
    const todayStr = new Date().toISOString().slice(0, 10);
    setSelectedDate(todayStr);
    setSelectedTerm('1');
    setRecordNote('');
    setActiveRecordId(`wh-${Date.now()}`);

    const currentStudents = dataService.getStudents();
    const initialRows = createRowsForGrade(gradeToUse, currentStudents);

    setTableRows(initialRows);
    setIsEditing(true);
  };

  const handleEditRecord = (record: WeightHeightRecord) => {
    const recGrade = record.gradeLevel || extractGradeFromClassroom(profile.classroomName);
    setSelectedGrade(recGrade);
    setSelectedDate(record.date);
    setSelectedTerm(record.term);
    setRecordNote(record.note || '');
    setActiveRecordId(record.id);
    setTableRows([...record.rows]);
    setIsEditing(true);
  };

  const handleGradeChange = (newGrade: GradeLevel) => {
    setSelectedGrade(newGrade);
    triggerAutoSave(tableRows, newGrade);
  };

  const handleLoadStudentsForGrade = (grade: GradeLevel) => {
    const currentStudents = dataService.getStudents();
    const gradeStudents = currentStudents.filter((s) => s.gradeLevel === grade);
    const hasExistingData = tableRows.some((r) => r.weight || r.height);

    const doPopulate = () => {
      const newRows = createRowsForGrade(grade, currentStudents);
      setTableRows(newRows);
      triggerAutoSave(newRows, grade);
      dataService.notifyToast(
        'info',
        `ดึงรายชื่อ ${grade} สำเร็จ`,
        `นำรายชื่อนักเรียนระดับชั้น ${grade} จำนวน ${gradeStudents.length} คน มาใส่ในตารางเรียบร้อย`
      );
    };

    if (hasExistingData) {
      dataService.showAlert({
        type: 'warning',
        title: 'ต้องการดึงรายชื่อใหม่?',
        text: `ตารางนี้มีข้อมูลน้ำหนัก-ส่วนสูงที่กรอกไว้แล้ว การดึงรายชื่อนักเรียนชั้น ${grade} ใหม่จะรีเซ็ตตารางนี้ คุณต้องการดำเนินการต่อหรือไม่?`,
        showCancelButton: true,
        confirmButtonText: 'ดึงรายชื่อใหม่',
        cancelButtonText: 'ยกเลิก',
        onConfirm: doPopulate,
      });
    } else {
      doPopulate();
    }
  };

  const handleDeleteRecord = (id: string, date: string, isPhoto = false) => {
    dataService.showAlert({
      type: 'warning',
      title: isPhoto ? 'ยืนยันการลบภาพถ่าย?' : 'ยืนยันการลบข้อมูล?',
      text: isPhoto
        ? `คุณต้องการลบภาพถ่ายกระดาษตารางน้ำหนัก-ส่วนสูง ประจำวันที่ ${formatThaiDate(date)} ใช่หรือไม่?`
        : `คุณต้องการลบข้อมูลน้ำหนัก-ส่วนสูง ประจำวันที่ ${formatThaiDate(date)} ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        dataService.deleteWeightHeightRecord(id);
      },
    });
  };

  // Add extra row (+ เพิ่มแถว)
  const handleAddRow = () => {
    const nextOrder = tableRows.length + 1;
    const currentStudents = dataService.getStudents();
    const nextStudent = currentStudents[tableRows.length];
    let nextGender: 'ชาย' | 'หญิง' | undefined = undefined;
    if (nextStudent) {
      if (nextStudent.prefix === 'เด็กชาย' || nextStudent.prefix === 'นาย' || nextStudent.gender === 'male') {
        nextGender = 'ชาย';
      } else if (nextStudent.prefix === 'เด็กหญิง' || nextStudent.prefix === 'นางสาว' || nextStudent.gender === 'female') {
        nextGender = 'หญิง';
      }
    }

    const newRow: WeightHeightRow = {
      id: `row-${Date.now()}`,
      order: nextOrder,
      studentId: nextStudent?.id,
      studentName: nextStudent ? `${nextStudent.prefix}${nextStudent.firstName} ${nextStudent.lastName}` : '',
      gender: nextGender,
      age: nextStudent ? nextStudent.age : '',
      weight: '',
      height: '',
    };

    setTableRows([...tableRows, newRow]);
    triggerAutoSave([...tableRows, newRow]);
  };

  // Row field update with auto BMI & Auto-Save
  const handleRowChange = (index: number, field: keyof WeightHeightRow, value: any) => {
    const updated = [...tableRows];
    const row = { ...updated[index], [field]: value };

    // Auto-detect gender when studentName changes (เด็กชาย=ชาย, เด็กหญิง=หญิง)
    if (field === 'studentName') {
      const name = String(value || '').trim();
      if (
        name.startsWith('เด็กชาย') ||
        name.includes('เด็กชาย') ||
        name.startsWith('ด.ช.') ||
        name.includes('ด.ช.') ||
        name.startsWith('นาย ') ||
        name.startsWith('นาย')
      ) {
        row.gender = 'ชาย';
      } else if (
        name.startsWith('เด็กหญิง') ||
        name.includes('เด็กหญิง') ||
        name.startsWith('ด.ญ.') ||
        name.includes('ด.ญ.') ||
        name.startsWith('นางสาว') ||
        name.startsWith('น.ส.')
      ) {
        row.gender = 'หญิง';
      }
    }

    // Calculate BMI and status based on weight, height, gender and age
    const w = field === 'weight' ? (value === '' ? '' : Number(value)) : row.weight;
    const h = field === 'height' ? (value === '' ? '' : Number(value)) : row.height;
    const g = field === 'gender' ? value : row.gender;
    const a = field === 'age' ? (value === '' ? '' : Number(value)) : row.age;

    const numW = Number(w);
    const numH = Number(h);
    const numA = typeof a === 'number' && a > 0 ? a : undefined;

    if (numW > 0 && numH > 0) {
      const result = calculateBMI(numW, numH, g, numA);
      row.bmi = result.bmi;
      row.status = result.status;
    } else {
      row.bmi = undefined;
      row.status = undefined;
    }

    updated[index] = row;
    setTableRows(updated);
    triggerAutoSave(updated);
  };

  // Auto-Save mechanism
  const triggerAutoSave = (rowsToSave: WeightHeightRow[], currentGrade = selectedGrade) => {
    if (!selectedDate) return;
    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const record: WeightHeightRecord = {
        id: activeRecordId || `wh-${Date.now()}`,
        date: selectedDate,
        gradeLevel: currentGrade,
        academicYear: profile.academicYear,
        term: selectedTerm,
        note: recordNote,
        rows: rowsToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dataService.saveWeightHeightRecord(record, true);
      setAutoSaveStatus('saved');
    }, 1200);
  };

  // Manual explicit save button
  const handleManualSave = () => {
    if (!selectedDate) {
      dataService.notifyToast('warning', 'กรุณาระบุวันที่บันทึก (Mandatory)');
      return;
    }

    const record: WeightHeightRecord = {
      id: activeRecordId || `wh-${Date.now()}`,
      date: selectedDate,
      gradeLevel: selectedGrade,
      academicYear: profile.academicYear,
      term: selectedTerm,
      note: recordNote,
      rows: tableRows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataService.saveWeightHeightRecord(record, false);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 w-full max-w-full min-w-0">
      {/* Top Header Card - Single row compact bar for mobile & desktop */}
      <div className="flex items-center justify-between gap-2.5 bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
            น้ำหนัก - ส่วนสูง (Weight & Height)
          </h2>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => handleOpenAddChoice()}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer shrink-0"
            title="เพิ่มบันทึกใหม่ (+)"
            aria-label="เพิ่มบันทึกใหม่"
          >
            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
            >
              ปิดฟอร์ม
            </button>
            <button
              type="button"
              onClick={() => {
                const currentRecord: WeightHeightRecord = {
                  id: activeRecordId || `wh-${Date.now()}`,
                  date: selectedDate,
                  gradeLevel: selectedGrade,
                  academicYear: profile.academicYear,
                  term: selectedTerm,
                  note: recordNote,
                  rows: tableRows,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setPrintRecord(currentRecord);
              }}
              className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
              title="พิมพ์ / ดาวน์โหลด PDF บันทึกนี้"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">พิมพ์ PDF</span>
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">บันทึก</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Form (When Editing or Creating New Record) */}
      {isEditing && (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-emerald-200/80 shadow-xs space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3.5 w-full">
              {/* ระดับชั้น ป.1 - ป.6 */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  ระดับชั้น <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(e.target.value as GradeLevel)}
                  className="w-full sm:w-auto px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-bold outline-hidden bg-white text-emerald-900"
                >
                  <option value="ป.1">ชั้น ป.1</option>
                  <option value="ป.2">ชั้น ป.2</option>
                  <option value="ป.3">ชั้น ป.3</option>
                  <option value="ป.4">ชั้น ป.4</option>
                  <option value="ป.5">ชั้น ป.5</option>
                  <option value="ป.6">ชั้น ป.6</option>
                </select>
              </div>

              {/* ภาคเรียน */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">ภาคเรียน</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value as '1' | '2')}
                  className="w-full sm:w-auto px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 focus:border-emerald-500 text-xs font-medium outline-hidden bg-white"
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </div>

              {/* วันที่บันทึก */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  วันที่บันทึก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-medium outline-hidden"
                  required
                />
              </div>

              {/* ปุ่มสัญลักษณ์คัดลอกรายชื่อตามชั้นเรียน (เฉพาะไอคอน ไม่มีข้อความ เพื่อความสวยงาม) */}
              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => setShowCopyAllStudentsModal(true)}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  title="คัดลอกรายชื่อตามชั้น"
                  aria-label="คัดลอกรายชื่อตามชั้น"
                >
                  <Copy className="w-4 h-4 text-purple-600" />
                </button>
              </div>

              {/* ปุ่มช่วยดึงรายชื่อตามชั้นเรียนที่เลือก */}
              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => handleLoadStudentsForGrade(selectedGrade)}
                  className="w-full sm:w-auto px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title={`ดึงรายชื่อนักเรียนระดับชั้น ${selectedGrade} เข้ามาในตาราง`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">ดึงรายชื่อ {selectedGrade} ({students.filter((s) => s.gradeLevel === selectedGrade).length})</span>
                </button>
              </div>

              {/* บันทึกเพิ่มเติม */}
              <div className="col-span-2 sm:flex-1 sm:min-w-[180px]">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม</label>
                <input
                  type="text"
                  value={recordNote}
                  onChange={(e) => setRecordNote(e.target.value)}
                  placeholder="เช่น ชั่งน้ำหนักต้นเทอม..."
                  className="w-full px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 focus:border-emerald-500 text-xs outline-hidden"
                />
              </div>
            </div>

            {/* Auto-Save Indicator */}
            <div className="flex items-center gap-1.5 text-xs shrink-0 self-end sm:self-center">
              {autoSaveStatus === 'saving' && (
                <span className="text-amber-600 flex items-center gap-1 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  กำลังบันทึก...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-Saved
                </span>
              )}
            </div>
          </div>

          {/* Mobile Student List (Full width, no horizontal scroll, touch-friendly) */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center justify-between px-1 py-0.5 text-xs text-slate-600 font-bold">
              <span>รายชื่อนักเรียน ({tableRows.length} คน)</span>
            </div>
            {tableRows.map((row, index) => {
              const hasData = (row.weight && Number(row.weight) > 0) || (row.height && Number(row.height) > 0);
              return (
                <div
                  key={row.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                    hasData
                      ? 'bg-white border-slate-200/90 shadow-2xs'
                      : 'bg-slate-50/70 border-dashed border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenWHModal(index)}
                        className="text-left font-bold text-xs text-slate-900 truncate hover:text-emerald-700 flex-1 cursor-pointer"
                        title="กดเพื่อเปิดหน้าต่างกรอกน้ำหนัก-ส่วนสูง"
                      >
                        {row.studentName || `นักเรียนคนที่ ${index + 1}`}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {row.gender && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          row.gender === 'ชาย' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {row.gender === 'ชาย' ? '👦 ชาย' : '👧 หญิง'}
                        </span>
                      )}
                      {row.age ? (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {row.age} ปี
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = tableRows.filter((_, i) => i !== index);
                          setTableRows(updated);
                          triggerAutoSave(updated);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                        title="ลบแถวนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Weight, Height, BMI Row */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span>นน.: <strong className="text-slate-900 font-bold">{row.weight ? `${row.weight}` : '-'}</strong> กก.</span>
                      <span className="text-slate-300">•</span>
                      <span>สส.: <strong className="text-slate-900 font-bold">{row.height ? `${row.height}` : '-'}</strong> ซม.</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {row.status ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                            row.status === 'สมส่วน'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.status === 'ผอม'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : row.status === 'ท้วม'
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                              : row.status === 'เริ่มอ้วน'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {row.status} ({row.bmi})
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleOpenWHModal(index)}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        {hasData ? 'แก้ไข' : '+ กรอก'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop/Tablet 6 Columns Table (hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-3 w-12 text-center">ลำดับ</th>
                  <th className="py-3 px-3 min-w-[210px]">
                    <span>ชื่อ-สกุล นักเรียน</span>
                  </th>
                  <th className="py-3 px-2 w-28 text-center">เพศ (ชาย/หญิง)</th>
                  <th className="py-3 px-2 w-16 text-center">อายุ (ปี)</th>
                  <th className="py-3 px-2 w-28 text-center">น้ำหนัก (กก.)</th>
                  <th className="py-3 px-2 w-28 text-center">ส่วนสูง (ซม.)</th>
                  <th className="py-3 px-3 min-w-[130px] text-center bg-emerald-50/50 text-emerald-800">
                    BMI / ภาวะโภชนาการ
                  </th>
                  <th className="py-3 px-2 w-12 text-center">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWHModal(index)}
                          className="flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 transition-colors truncate cursor-pointer flex items-center justify-between gap-1 group/sname"
                          title="กดที่ชื่อเพื่อเปิดหน้าต่างกรอกน้ำหนัก-ส่วนสูง (Pop-up เต็มจอ)"
                        >
                          <span className="truncate">{row.studentName || `ระบุชื่อคนที่ ${index + 1}`}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 group-hover/sname:bg-emerald-600 group-hover/sname:text-white transition-colors">
                            กรอกข้อมูล
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleRowChange(index, 'gender', 'ชาย')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            row.gender === 'ชาย'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-sky-700'
                          }`}
                          title="กำหนดเป็นเพศชาย (เด็กชาย / นาย)"
                        >
                          👦 ชาย
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRowChange(index, 'gender', 'หญิง')}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            row.gender === 'หญิง'
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-rose-700'
                          }`}
                          title="กำหนดเป็นเพศหญิง (เด็กหญิง / นางสาว)"
                        >
                          👧 หญิง
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={row.age}
                        onChange={(e) =>
                          handleRowChange(index, 'age', e.target.value ? Number(e.target.value) : '')
                        }
                        placeholder="12"
                        className="w-14 mx-auto text-center px-1.5 py-1.5 rounded-lg border border-slate-200 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="10"
                        max="150"
                        value={row.weight}
                        onChange={(e) =>
                          handleRowChange(index, 'weight', e.target.value ? Number(e.target.value) : '')
                        }
                        placeholder="กก."
                        className="w-20 mx-auto text-center font-semibold text-slate-800 px-1.5 py-1.5 rounded-lg border border-slate-200 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="50"
                        max="220"
                        value={row.height}
                        onChange={(e) =>
                          handleRowChange(index, 'height', e.target.value ? Number(e.target.value) : '')
                        }
                        placeholder="ซม."
                        className="w-20 mx-auto text-center font-semibold text-slate-800 px-1.5 py-1.5 rounded-lg border border-slate-200 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                      {row.bmi ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-gray-900 text-xs">{row.bmi}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                              row.status === 'สมส่วน'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : row.status === 'ผอม'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : row.status === 'ท้วม'
                                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                : row.status === 'เริ่มอ้วน'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                            title={`เกณฑ์กรมอนามัย: ${row.status}`}
                          >
                            {row.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = tableRows.filter((_, i) => i !== index);
                          setTableRows(updated);
                          triggerAutoSave(updated);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                        title="ลบแถวนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Action: + เพิ่มแถว */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ เพิ่มแถว (เพิ่มรายชื่อ)</span>
            </button>

            <span className="text-xs text-slate-400">จำนวนทั้งหมด {tableRows.length} แถว</span>
          </div>
        </div>
      )}

      {/* Saved Records List (แถวรายการ สะอาด เรียบง่าย เรียงวันปัจจุบันอยู่ด้านบน) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>ประวัติการบันทึกน้ำหนัก-ส่วนสูง</span>
            </h3>
            <span className="text-xs text-slate-500">({filteredRecords.length} รายการ)</span>
          </div>

          {/* แถบเลือกกรองระดับชั้น ป.1 - ป.6 */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {(['all', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setListGradeFilter(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  listGradeFilter === g
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {g === 'all' ? 'ทุกชั้น' : g}
              </button>
            ))}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 text-slate-400">
            <Activity className="w-9 h-9 mx-auto text-slate-300 mb-2" />
            <p className="text-xs">ยังไม่มีรายการบันทึกน้ำหนัก-ส่วนสูง</p>
            <button
              onClick={() => handleOpenAddChoice()}
              className="mt-3 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              + บันทึกครั้งแรก
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-400">
            <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs">ไม่พบบันทึกน้ำหนัก-ส่วนสูงของชั้น {listGradeFilter}</p>
            <button
              onClick={() => handleOpenAddChoice(listGradeFilter !== 'all' ? listGradeFilter : undefined)}
              className="mt-3 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              + เพิ่มบันทึกของชั้น {listGradeFilter}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => {
                const recGrade = rec.gradeLevel || extractGradeFromClassroom(profile.classroomName);
                const dateText = formatThaiDate(rec.date);
                const isPhotoRecord = rec.recordType === 'photo' || Boolean(rec.imageUrl);

                return (
                  <div
                    key={rec.id}
                    className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* ข้อความข้อมูลรายการ */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isPhotoRecord && rec.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setZoomLevel(1);
                            setViewPhotoRecord(rec);
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 border border-indigo-200 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer relative group bg-indigo-50"
                          title="คลิกเพื่อดูภาพเต็มจอ"
                        >
                          <img
                            src={rec.imageUrl}
                            alt={rec.note || 'ภาพถ่ายตาราง'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                          <Calendar className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            {recGrade}
                          </span>
                          {isPhotoRecord && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                              <Camera className="w-3 h-3 text-indigo-600" />
                              ภาพถ่ายตาราง
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-bold text-slate-800">
                            {dateText}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                            เทอม {rec.term}/{rec.academicYear || profile.academicYear}
                          </span>
                        </div>
                        {rec.note && (
                          <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5" title={rec.note}>
                            {rec.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* สัญลักษณ์ปุ่มคำสั่ง */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isPhotoRecord ? (
                        <>
                          {/* ไอคอนตา: ดูภาพถ่ายตารางที่อัปโหลดเท่านั้น ขนาดเต็มจอ */}
                          <button
                            type="button"
                            onClick={() => {
                              setZoomLevel(1);
                              setViewPhotoRecord(rec);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 hover:text-emerald-900 border border-emerald-300 rounded-xl transition-all shadow-2xs cursor-pointer hover:scale-105"
                            title="ดูภาพถ่ายตาราง (ขนาดเต็มจอ)"
                            aria-label="ดูภาพถ่ายตารางที่อัปโหลด"
                          >
                            <Eye className="w-4 h-4 stroke-[2.3]" />
                          </button>

                          {/* ดาวน์โหลดภาพ */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPhoto(rec.imageUrl!, rec.imageFileName)}
                            className="w-8 h-8 flex items-center justify-center bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 border border-sky-200 rounded-xl transition-all cursor-pointer"
                            title="ดาวน์โหลดภาพถ่ายนี้"
                            aria-label="ดาวน์โหลดภาพถ่าย"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* ลบ */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.id, rec.date, true)}
                            className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer"
                            title="ลบภาพถ่ายนี้"
                            aria-label="ลบภาพถ่าย"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* สัญลักษณ์: เครื่องปริ้น (ดาวน์โหลด PDF), แก้ไข, ลบ */}
                          <button
                            type="button"
                            onClick={() => setPrintRecord(rec)}
                            className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-300 rounded-xl transition-all shadow-2xs cursor-pointer hover:scale-105"
                            title="พิมพ์ / ดาวน์โหลดรายงาน PDF (ประจำครั้งนี้)"
                            aria-label="พิมพ์หรือดาวน์โหลดรายงานเป็นไฟล์ PDF"
                          >
                            <Printer className="w-4 h-4 text-emerald-700" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditRecord(rec)}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
                            title="แก้ไขข้อมูล (รวมทั้งเปลี่ยนระดับชั้น ป.1-ป.6)"
                            aria-label="แก้ไขข้อมูล"
                          >
                            <Edit className="w-4 h-4 text-slate-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec.id, rec.date, false)}
                            className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer"
                            title="ลบข้อมูล"
                            aria-label="ลบข้อมูล"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Printable PDF Report Modal */}
      {printRecord && (() => {
        // Only print rows that have student name or weight/height
        const validRows = printRecord.rows.filter(
          (r) => (r.studentName && r.studentName.trim() !== '') || r.weight || r.height
        );
        const rowsToPrint = validRows.length > 0 ? validRows : printRecord.rows;

        // Statistics
        const totalMeasured = rowsToPrint.filter((r) => r.weight && r.height).length;
        const countNormal = rowsToPrint.filter((r) => r.status === 'สมส่วน').length;
        const countThin = rowsToPrint.filter((r) => r.status === 'ผอม').length;
        const countOver = rowsToPrint.filter(
          (r) => r.status === 'ท้วม' || r.status === 'เริ่มอ้วน' || r.status === 'อ้วน'
        ).length;

        const sumWeight = rowsToPrint.reduce((acc, r) => acc + (typeof r.weight === 'number' ? r.weight : Number(r.weight) || 0), 0);
        const sumHeight = rowsToPrint.reduce((acc, r) => acc + (typeof r.height === 'number' ? r.height : Number(r.height) || 0), 0);
        const avgWeight = totalMeasured > 0 ? (sumWeight / totalMeasured).toFixed(1) : '-';
        const avgHeight = totalMeasured > 0 ? (sumHeight / totalMeasured).toFixed(1) : '-';

        // แยกเฉพาะระดับชั้น เช่น "5" หรือตามชื่อห้องเรียน หรือตามระดับชั้นที่บันทึก
        const gradeNumMatch = printRecord.gradeLevel
          ? printRecord.gradeLevel.match(/\d+/)
          : (profile.classroomName ? profile.classroomName.match(/\d+/) : null);
        const gradeText = gradeNumMatch
          ? gradeNumMatch[0]
          : (printRecord.gradeLevel?.replace('ป.', '') || profile.classroomName?.replace(/^ชั้นประถมศึกษาปีที่\s*/, '') || '5');
        const termText = printRecord.term || '1';
        const yearText = printRecord.academicYear || profile.academicYear || '2569';
        const recordDateText = formatThaiDate(printRecord.date, false);

        return (
          <PrintReportModal
            isOpen={true}
            onClose={() => setPrintRecord(null)}
            title="แบบบันทึกน้ำหนัก-ส่วนสูง"
            subtitle={`ชั้นประถมศึกษาปีที่ ${gradeText} ภาคเรียนที่ ${termText} ปีการศึกษา ${yearText}`}
            profile={profile}
            hidePrintDate={true}
            customHeader={
              <div className="space-y-1 text-center">
                {/* หัวข้อบรรทัดแรก : แบบบันทึกน้ำหนัก-ส่วนสูง */}
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-normal">
                  แบบบันทึกน้ำหนัก-ส่วนสูง
                </h2>
                {/* หัวข้อบรรทัดที่ 2 ชั้นประถมศึกษาปีที่ ภาคเรียนที่ ปีการศึกษา */}
                <p className="text-sm sm:text-base font-semibold text-slate-800">
                  ชั้นประถมศึกษาปีที่ {gradeText} ภาคเรียนที่ {termText} ปีการศึกษา {yearText}
                </p>
                {/* หัวข้อบรรทัดที่ 3 ขนาดเล็กมาก วัน เดือน ปี ที่ได้บันทึก */}
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-normal pt-0.5">
                  วัน เดือน ปี ที่ได้บันทึก : {recordDateText}
                </p>
              </div>
            }
          >
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                  <th className="border border-slate-400 p-2 text-center w-12">ลำดับ</th>
                  <th className="border border-slate-400 p-2 text-left">ชื่อ - นามสกุล นักเรียน</th>
                  <th className="border border-slate-400 p-2 text-center w-16">เพศ</th>
                  <th className="border border-slate-400 p-2 text-center w-16">อายุ (ปี)</th>
                  <th className="border border-slate-400 p-2 text-center w-24">น้ำหนัก (กก.)</th>
                  <th className="border border-slate-400 p-2 text-center w-24">ส่วนสูง (ซม.)</th>
                  <th className="border border-slate-400 p-2 text-center w-20">BMI</th>
                  <th className="border border-slate-400 p-2 text-center w-28">ภาวะโภชนาการ</th>
                </tr>
              </thead>
              <tbody>
                {rowsToPrint.map((row, i) => (
                  <tr key={row.id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-medium">{row.studentName || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-center">{row.gender || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-center">{row.age || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-semibold">
                      {row.weight ? `${row.weight}` : '-'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-semibold">
                      {row.height ? `${row.height}` : '-'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold">
                      {row.bmi || '-'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-medium">
                      {row.status || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="border border-slate-400 p-2 text-right">
                    สรุปผลการประเมิน ({rowsToPrint.length} รายการ | ชั่งวัดแล้ว {totalMeasured} คน):
                  </td>
                  <td className="border border-slate-400 p-2 text-center text-slate-800">
                    เฉลี่ย {avgWeight}
                  </td>
                  <td className="border border-slate-400 p-2 text-center text-slate-800">
                    เฉลี่ย {avgHeight}
                  </td>
                  <td colSpan={2} className="border border-slate-400 p-2 text-center text-[11px] text-slate-700">
                    สมส่วน {countNormal} • ผอม {countThin} • เกินเกณฑ์ {countOver}
                  </td>
                </tr>
              </tfoot>
            </table>
          </PrintReportModal>
        );
      })()}

      {/* Pop-up บันทึกน้ำหนัก-ส่วนสูงแบบเต็มจอสำหรับมือถือ (Req: เมื่อกดชื่อ จะแสดงpop-up ให้ลงคะแนน/น้ำหนัก-ส่วนสูงให้เรียบร้อย ลงเสร็จก็กดบันทึก) */}
      {whModalIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[92vh] md:max-w-md md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    คนที่ {whModalIndex + 1} จาก {tableRows.length}
                  </span>
                  <span className="text-emerald-100 text-xs">
                    {selectedGrade} ({formatThaiDate(selectedDate)})
                  </span>
                </div>
                <h3 className="text-base font-bold truncate mt-0.5">
                  {modalStudentName || `นักเรียนคนที่ ${whModalIndex + 1}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWhModalIndex(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
              {/* ชื่อ-สกุล */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  ชื่อ - นามสกุล นักเรียน
                </label>
                <input
                  type="text"
                  value={modalStudentName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setModalStudentName(name);
                    if (
                      name.startsWith('เด็กชาย') ||
                      name.includes('เด็กชาย') ||
                      name.startsWith('ด.ช.') ||
                      name.includes('ด.ช.') ||
                      name.startsWith('นาย ') ||
                      name.startsWith('นาย')
                    ) {
                      setModalGender('ชาย');
                    } else if (
                      name.startsWith('เด็กหญิง') ||
                      name.includes('เด็กหญิง') ||
                      name.startsWith('ด.ญ.') ||
                      name.includes('ด.ญ.') ||
                      name.startsWith('นางสาว') ||
                      name.startsWith('น.ส.')
                    ) {
                      setModalGender('หญิง');
                    }
                  }}
                  placeholder="ระบุชื่อ-นามสกุล..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:bg-white text-xs font-semibold outline-hidden"
                />
              </div>

              {/* เพศ และ อายุ */}
              <div className="grid grid-cols-2 gap-3">
                {/* เพศ */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    เพศ
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setModalGender('ชาย')}
                      className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        modalGender === 'ชาย'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-sky-700'
                      }`}
                    >
                      👦 ชาย
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalGender('หญิง')}
                      className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        modalGender === 'หญิง'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      👧 หญิง
                    </button>
                  </div>
                </div>

                {/* อายุ */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    อายุ (ปี)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof modalAge === 'number' ? modalAge : 10;
                        setModalAge(Math.max(3, cur - 1));
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={modalAge}
                      onChange={(e) => setModalAge(e.target.value ? Number(e.target.value) : '')}
                      placeholder="10"
                      className="flex-1 text-center py-1.5 px-1 rounded-lg border border-slate-200 focus:border-emerald-500 text-xs font-bold outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = typeof modalAge === 'number' ? modalAge : 10;
                        setModalAge(Math.min(20, cur + 1));
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* น้ำหนัก และ ส่วนสูง */}
              <div className="grid grid-cols-2 gap-3">
                {/* น้ำหนัก */}
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-emerald-950">
                      น้ำหนัก (กก.)
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700">
                      kg
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="150"
                    value={modalWeight}
                    onChange={(e) => setModalWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.0"
                    className="w-full text-center text-xl font-black py-2 rounded-xl border-2 border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden bg-emerald-50/20"
                  />
                  {/* Quick adjustments */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[-1, -0.5, +0.5, +1].map((delta) => (
                      <button
                        key={`w-delta-${delta}`}
                        type="button"
                        onClick={() => {
                          const cur = typeof modalWeight === 'number' ? modalWeight : 30;
                          const next = Math.max(0, Number((cur + delta).toFixed(1)));
                          setModalWeight(next);
                        }}
                        className="py-1 text-[10px] font-bold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ส่วนสูง */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-teal-950">
                      ส่วนสูง (ซม.)
                    </label>
                    <span className="text-[11px] font-bold text-teal-700">
                      cm
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="50"
                    max="220"
                    value={modalHeight}
                    onChange={(e) => setModalHeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.0"
                    className="w-full text-center text-xl font-black py-2 rounded-xl border-2 border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-hidden bg-teal-50/20"
                  />
                  {/* Quick adjustments */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[-1, -0.5, +0.5, +1].map((delta) => (
                      <button
                        key={`h-delta-${delta}`}
                        type="button"
                        onClick={() => {
                          const cur = typeof modalHeight === 'number' ? modalHeight : 130;
                          const next = Math.max(0, Number((cur + delta).toFixed(1)));
                          setModalHeight(next);
                        }}
                        className="py-1 text-[10px] font-bold rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BMI & ภาวะโภชนาการ Preview */}
              {(() => {
                const liveBMI =
                  typeof modalWeight === 'number' &&
                  typeof modalHeight === 'number' &&
                  modalHeight > 0
                    ? calculateBMI(
                        modalWeight,
                        modalHeight,
                        modalGender,
                        typeof modalAge === 'number' ? modalAge : undefined
                      )
                    : null;

                if (!liveBMI) {
                  return (
                    <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
                      กรอกน้ำหนักและส่วนสูงเพื่อประเมินค่า BMI และภาวะโภชนาการ
                    </div>
                  );
                }

                let colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                if (liveBMI.status.includes('ผอม')) {
                  colorClass = 'bg-sky-50 border-sky-200 text-sky-900';
                } else if (liveBMI.status.includes('อ้วน') || liveBMI.status.includes('เกิน')) {
                  colorClass = 'bg-amber-50 border-amber-200 text-amber-900';
                }

                return (
                  <div className={`p-3.5 rounded-xl border ${colorClass} shadow-2xs flex items-center justify-between`}>
                    <div>
                      <span className="text-[11px] font-semibold opacity-75 block">
                        ดัชนีมวลกาย (BMI)
                      </span>
                      <span className="text-xl font-black">
                        {liveBMI.bmi} <span className="text-xs font-normal opacity-70">กก./ม.²</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold opacity-75 block">
                        การแปลผลโภชนาการ
                      </span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/80 shadow-2xs border border-current">
                        {liveBMI.status}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrevStudentWHModal}
                disabled={whModalIndex === 0}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">ก่อนหน้า</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveWHModal(true)}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกข้อมูล</span>
              </button>

              <button
                type="button"
                onClick={handleNextStudentWHModal}
                disabled={whModalIndex === tableRows.length - 1}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <span className="hidden sm:inline">คนถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal คัดลอกรายชื่อทั้งหมดตามระดับชั้น เพื่อแทนที่ข้อมูลเดิมทันทีตามจำนวนจริง */}
      <CopyAllStudentsModal
        isOpen={showCopyAllStudentsModal}
        onClose={() => setShowCopyAllStudentsModal(false)}
        defaultGrade={selectedGrade}
        onApplyStudents={handleApplyStudentsFromCopy}
        title="คัดลอกรายชื่อนักเรียน (หน้าน้ำหนัก-ส่วนสูง)"
        subtitle="เลือกชั้นเรียนเพื่อคัดลอกรายชื่อทั้งหมด"
      />

      {/* 1. Modal เลือกรูปแบบการบันทึก: กรอกข้อมูลลงตาราง หรือ อัปโหลดภาพถ่ายเพื่อเก็บ */}
      {showAddChoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">เลือกรูปแบบการบันทึกน้ำหนัก-ส่วนสูง</h3>
                  <p className="text-[11px] text-emerald-100">เลือกระหว่างกรอกข้อมูลลงตาราง หรืออัปโหลดภาพถ่ายกระดาษ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChoiceModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 sm:p-5 space-y-3">
              {/* ตัวเลือกที่ 1: กรอกข้อมูลลงตาราง */}
              <button
                type="button"
                onClick={handleSelectFormEntry}
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/80 transition-all cursor-pointer group flex items-start gap-3.5 shadow-2xs hover:shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-emerald-800">
                      กรอกข้อมูลลงตาราง
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      คำนวณ BMI
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    กรอกข้อมูลนักเรียนรายคน คำนวณ BMI อัตโนมัติ พร้อมสั่งพิมพ์รายงานสรุปผลขนาด A4
                  </p>
                </div>
              </button>

              {/* ตัวเลือกที่ 2: อัปโหลดภาพเพื่อเก็บ */}
              <button
                type="button"
                onClick={handleSelectPhotoUpload}
                className="w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-200 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50/80 transition-all cursor-pointer group flex items-start gap-3.5 shadow-2xs hover:shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-indigo-800">
                      อัปโหลดภาพเพื่อเก็บ
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      ภาพถ่ายกระดาษ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ถ่ายรูปหรือแนบภาพถ่ายกระดาษตารางวัดน้ำหนักส่วนสูงที่นักเรียนเขียนไว้ ดูภาพเต็มจอได้ตลอดเวลา
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddChoiceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal อัปโหลดภาพเพื่อเก็บ: ถ่ายรูปหรือแนบภาพกระดาษตารางวัดน้ำหนักส่วนสูง */}
      {showUploadPhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">อัปโหลดภาพตารางน้ำหนัก-ส่วนสูง</h3>
                  <p className="text-[11px] text-indigo-100">บันทึกรูปถ่ายกระดาษตารางที่นักเรียนได้เขียนไว้</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadPhotoModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePhotoRecord} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Hidden file inputs */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoFileChange}
                className="hidden"
              />

              {/* Row 1: ระดับชั้น & วันที่ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระดับชั้น <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={photoGrade}
                    onChange={(e) => setPhotoGrade(e.target.value as GradeLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  >
                    {ALL_GRADES.map((g) => (
                      <option key={`p-grade-${g}`} value={g}>
                        ชั้น {g} (ประถมศึกษาปีที่ {g.replace('ป.', '')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันที่ตรวจวัด <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={photoDate}
                    onChange={(e) => setPhotoDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Row 2: ภาคเรียน & ปีการศึกษา */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ภาคเรียน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={photoTerm}
                    onChange={(e) => setPhotoTerm(e.target.value as '1' | '2')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ปีการศึกษา (พ.ศ.)
                  </label>
                  <input
                    type="text"
                    value={photoYear}
                    onChange={(e) => setPhotoYear(e.target.value)}
                    placeholder="2569"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Row 3: ชื่อบันทึก / คำอธิบาย */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อบันทึก / คำอธิบายเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                  placeholder="เช่น ใบบันทึกน้ำหนัก-ส่วนสูง ป.1 เทอม 1 ที่นักเรียนเขียนในกระดาษ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Row 4: พื้นที่อัปโหลดรูปภาพ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>
                    รูปถ่ายกระดาษตารางวัดน้ำหนัก-ส่วนสูง <span className="text-rose-500">*</span>
                  </span>
                  {photoPreview && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> เลือกรูปเรียบร้อยแล้ว
                    </span>
                  )}
                </label>

                {!photoPreview ? (
                  <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-5 sm:p-6 text-center bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-1">
                      ถ่ายภาพหรือเลือกไฟล์รูปภาพกระดาษตาราง
                    </p>
                    <p className="text-[11px] text-slate-500 mb-4">
                      กรณีถ่ายกระดาษตารางวัดน้ำหนักส่วนสูงที่นักเรียนได้เขียนในกระดาษไว้
                    </p>

                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>ถ่ายภาพด้วยกล้อง</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        <span>เลือกไฟล์รูปภาพ</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-indigo-200 rounded-2xl p-3 bg-indigo-50/30 space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center max-h-72">
                      <img
                        src={photoPreview}
                        alt="พรีวิวภาพถ่ายตาราง"
                        className="max-h-64 w-auto object-contain mx-auto"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <span className="text-slate-600 truncate max-w-xs text-[11px]">
                        {photoFile?.name || 'รูปภาพกระดาษตาราง'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          ถ่ายใหม่
                        </button>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          เปลี่ยนรูป
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          ลบรูป
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUploadPhotoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!photoPreview || isSavingPhoto}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSavingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>บันทึกภาพถ่ายตาราง</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal ดูภาพถ่ายตารางขนาดเต็มจอ (เน้นกดไอคอนตาต้องแสดงภาพที่อัปโหลดเท่านั้น) */}
      {viewPhotoRecord && viewPhotoRecord.imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          {/* Printable style for direct print */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #photo-modal-print-view, #photo-modal-print-view * {
                visibility: visible !important;
              }
              #photo-modal-print-view {
                position: fixed !important;
                inset: 0 !important;
                background: white !important;
                padding: 5mm !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 999999 !important;
              }
            }
          `}</style>

          <div className="bg-slate-900 rounded-2xl sm:rounded-3xl max-w-5xl w-full h-[92vh] max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden text-white animate-in zoom-in-95 duration-200">
            {/* Top Toolbar */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
                      {viewPhotoRecord.note || 'ภาพถ่ายกระดาษตารางวัดน้ำหนัก-ส่วนสูง'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 shrink-0">
                      {viewPhotoRecord.gradeLevel || 'ป.1'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>ภาคเรียนที่ {viewPhotoRecord.term}/{viewPhotoRecord.academicYear || profile.academicYear}</span>
                    <span>•</span>
                    <span>วันที่ {formatThaiDate(viewPhotoRecord.date)}</span>
                  </div>
                </div>
              </div>

              {/* Tool buttons: Zoom, Download, Print, Close */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Zoom Controls */}
                <div className="hidden sm:inline-flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="ซูมออก (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="รีเซ็ตขนาด 100%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="ซูมเข้า (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* ดาวน์โหลดรูปภาพ */}
                <button
                  type="button"
                  onClick={() => handleDownloadPhoto(viewPhotoRecord.imageUrl!, viewPhotoRecord.imageFileName)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  title="ดาวน์โหลดภาพถ่ายนี้ลงอุปกรณ์"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">ดาวน์โหลด</span>
                </button>

                {/* สั่งพิมพ์ภาพ */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="สั่งพิมพ์ภาพถ่ายนี้"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden md:inline">พิมพ์ภาพ</span>
                </button>

                {/* ปิด */}
                <button
                  type="button"
                  onClick={() => setViewPhotoRecord(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View Container - Fit perfectly to screen, supports zoom */}
            <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-3 sm:p-6 select-none relative">
              <div
                className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={viewPhotoRecord.imageUrl}
                  alt={viewPhotoRecord.note || 'ภาพถ่ายกระดาษตารางวัดน้ำหนัก-ส่วนสูง'}
                  className="max-h-[72vh] sm:max-h-[76vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-slate-800/80"
                />
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                แสดงภาพถ่ายกระดาษตารางที่อัปโหลดไว้ขนาดเต็มพอดีจอ
              </span>
              <span className="hidden sm:inline text-slate-500">
                สามารถกดซูมเข้า (+) เพื่อตรวจดูลายมือนักเรียนบนกระดาษได้อย่างคมชัด
              </span>
            </div>
          </div>

          {/* Hidden print container for browser print */}
          <div id="photo-modal-print-view" className="hidden">
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px', textAlign: 'center' }}>
              ภาพถ่ายกระดาษตารางวัดน้ำหนัก-ส่วนสูง ชั้น {viewPhotoRecord.gradeLevel || 'ป.1'}
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', textAlign: 'center' }}>
              ภาคเรียนที่ {viewPhotoRecord.term} ปีการศึกษา {viewPhotoRecord.academicYear || profile.academicYear} • วันที่ {formatThaiDate(viewPhotoRecord.date)}
              {viewPhotoRecord.note ? ` (${viewPhotoRecord.note})` : ''}
            </p>
            <img
              src={viewPhotoRecord.imageUrl}
              alt="ภาพถ่ายตาราง"
              style={{ maxHeight: '85vh', maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
