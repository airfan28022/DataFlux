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
  AlertCircle
} from 'lucide-react';

interface WeightHeightViewProps {
  isAdmin: boolean;
}

const ALL_GRADES: GradeLevel[] = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

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
  const rowsCount = Math.max(studentsToUse.length, 15);
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
      id: `row-${Date.now()}-${i + 1}`,
      order: i + 1,
      studentId: student?.id,
      studentName: student ? `${student.prefix}${student.firstName} ${student.lastName}` : '',
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

  const handleDeleteRecord = (id: string, date: string) => {
    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันการลบข้อมูล?',
      text: `คุณต้องการลบข้อมูลน้ำหนัก-ส่วนสูง ประจำวันที่ ${formatThaiDate(date)} ใช่หรือไม่?`,
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
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-emerald-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">น้ำหนัก - ส่วนสูง (Weight & Height)</h2>
            </div>
            <p className="text-xs text-gray-500">
              บันทึกสุขภาพการเจริญเติบโต คำนวณค่าดัชนีมวลกาย (BMI) อัตโนมัติ พร้อมระบบ Auto-Save
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => handleStartNewRecord()}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl flex items-center justify-center font-bold text-lg transition-all shadow-xs cursor-pointer"
            title="เพิ่มบันทึกใหม่ (+)"
            aria-label="เพิ่มบันทึกใหม่"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
              title="พิมพ์ / ดาวน์โหลด PDF บันทึกนี้"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>พิมพ์ PDF</span>
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกข้อมูล</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Form (When Editing or Creating New Record) */}
      {isEditing && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              {/* ระดับชั้น ป.1 - ป.6 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ระดับชั้น <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(e.target.value as GradeLevel)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-bold outline-hidden bg-white text-emerald-900"
                >
                  <option value="ป.1">ชั้นประถมศึกษาปีที่ 1 (ป.1)</option>
                  <option value="ป.2">ชั้นประถมศึกษาปีที่ 2 (ป.2)</option>
                  <option value="ป.3">ชั้นประถมศึกษาปีที่ 3 (ป.3)</option>
                  <option value="ป.4">ชั้นประถมศึกษาปีที่ 4 (ป.4)</option>
                  <option value="ป.5">ชั้นประถมศึกษาปีที่ 5 (ป.5)</option>
                  <option value="ป.6">ชั้นประถมศึกษาปีที่ 6 (ป.6)</option>
                </select>
              </div>

              {/* ปุ่มช่วยดึงรายชื่อตามชั้นเรียนที่เลือก */}
              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => handleLoadStudentsForGrade(selectedGrade)}
                  className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={`ดึงรายชื่อนักเรียนระดับชั้น ${selectedGrade} เข้ามาในตาราง`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ดึงรายชื่อ {selectedGrade} ({students.filter((s) => s.gradeLevel === selectedGrade).length} คน)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วันที่บันทึก (Mandatory) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs font-medium outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ภาคเรียน</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value as '1' | '2')}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 text-xs font-medium outline-hidden bg-white"
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม</label>
                <input
                  type="text"
                  value={recordNote}
                  onChange={(e) => setRecordNote(e.target.value)}
                  placeholder="เช่น ชั่งน้ำหนักต้นเทอม, ก่อนกิจกรรมกีฬาสี..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 text-xs outline-hidden"
                />
              </div>
            </div>

            {/* Auto-Save Indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {autoSaveStatus === 'saving' && (
                <span className="text-amber-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  กำลังบันทึกอัตโนมัติ...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  บันทึกอัตโนมัติแล้ว (Auto-Saved)
                </span>
              )}
            </div>
          </div>

          {/* 6 Columns Table with Gender Column */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-3 w-12 text-center">ลำดับ</th>
                  <th className="py-3 px-3 min-w-[210px]">ชื่อ-สกุล นักเรียน</th>
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
                      <input
                        type="text"
                        value={row.studentName}
                        onChange={(e) => handleRowChange(index, 'studentName', e.target.value)}
                        placeholder={`ระบุชื่อ-สกุล นักเรียนคนที่ ${index + 1}`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:bg-white text-xs outline-hidden"
                      />
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
              onClick={() => handleStartNewRecord()}
              className="mt-3 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              + บันทึกครั้งแรก
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-400">
            <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs">ไม่พบบันทึกน้ำหนัก-ส่วนสูงของชั้น {listGradeFilter}</p>
            <button
              onClick={() => handleStartNewRecord(listGradeFilter !== 'all' ? listGradeFilter : undefined)}
              className="mt-3 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              + เพิ่มบันทึกของชั้น {listGradeFilter}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => {
                const recGrade = rec.gradeLevel || extractGradeFromClassroom(profile.classroomName);
                const gradeNum = recGrade.replace('ป.', '');
                const dateText = formatThaiDate(rec.date);
                const infoText = `ชั้นประถมศึกษาปีที่ ${gradeNum} • ภาคเรียนที่ ${rec.term} ปีการศึกษา ${rec.academicYear || profile.academicYear} • วันที่ ${dateText}${rec.note ? ` (${rec.note})` : ''}`;

                return (
                  <div
                    key={rec.id}
                    className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* ข้อความข้อมูลรายการ */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        {recGrade}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 truncate" title={infoText}>
                        {infoText}
                      </span>
                    </div>

                    {/* สัญลักษณ์: เครื่องปริ้น (ดาวน์โหลด PDF), แก้ไข, ลบ */}
                    <div className="flex items-center gap-1 shrink-0">
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
                        onClick={() => handleDeleteRecord(rec.id, rec.date)}
                        className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl transition-all cursor-pointer"
                        title="ลบข้อมูล"
                        aria-label="ลบข้อมูล"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
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
    </div>
  );
};
