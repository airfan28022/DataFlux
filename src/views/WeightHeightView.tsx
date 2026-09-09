import React, { useState, useEffect, useRef } from 'react';
import {
  WeightHeightRecord,
  WeightHeightRow,
  Student,
  TeacherProfile
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
  CheckCircle2,
  Users,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

interface WeightHeightViewProps {
  isAdmin: boolean;
}

export const WeightHeightView: React.FC<WeightHeightViewProps> = ({ isAdmin }) => {
  const [records, setRecords] = useState<WeightHeightRecord[]>(dataService.getWeightHeightRecords());
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());

  // Active record editor state
  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setRecords(dataService.getWeightHeightRecords());
      setStudents(dataService.getStudents());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  // Initialize a new record with 15 initial rows
  const handleStartNewRecord = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setSelectedDate(todayStr);
    setSelectedTerm('1');
    setRecordNote('');
    setActiveRecordId(`wh-${Date.now()}`);

    // Generate initial 15 rows, prefilling with students from DB if available
    const initialRows: WeightHeightRow[] = [];
    const currentStudents = dataService.getStudents();

    for (let i = 0; i < 15; i++) {
      const student = currentStudents[i];
      let initialGender: 'ชาย' | 'หญิง' | undefined = undefined;
      if (student) {
        if (student.prefix === 'เด็กชาย' || student.prefix === 'นาย' || student.gender === 'male') {
          initialGender = 'ชาย';
        } else if (student.prefix === 'เด็กหญิง' || student.prefix === 'นางสาว' || student.gender === 'female') {
          initialGender = 'หญิง';
        }
      }

      initialRows.push({
        id: `row-${i + 1}`,
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

    setTableRows(initialRows);
    setIsEditing(true);
  };

  const handleEditRecord = (record: WeightHeightRecord) => {
    setSelectedDate(record.date);
    setSelectedTerm(record.term);
    setRecordNote(record.note || '');
    setActiveRecordId(record.id);
    setTableRows([...record.rows]);
    setIsEditing(true);
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
  const triggerAutoSave = (rowsToSave: WeightHeightRow[]) => {
    if (!selectedDate) return;
    setAutoSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const record: WeightHeightRecord = {
        id: activeRecordId || `wh-${Date.now()}`,
        date: selectedDate,
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
            onClick={handleStartNewRecord}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มบันทึกใหม่</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              ปิดฟอร์ม
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม (ถ้ามี)</label>
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

          {/* Official BMI Criteria Guide Bar */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-700">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="font-bold text-emerald-800">สูตรคำนวณมาตรฐาน:</span>
              <span>BMI = น้ำหนัก (กก.) ÷ [ส่วนสูง (ม.)]²</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="font-semibold text-gray-500">เกณฑ์อ้างอิงกรมอนามัย กระทรวงสาธารณสุข:</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">ผอม (&lt;18.5)</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">สมส่วน (18.5-22.9)</span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">ท้วม (23.0-24.9)</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">เริ่มอ้วน (25.0-29.9)</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">อ้วน (≥30.0)</span>
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

      {/* Saved Records Cards List (แยกตามวันที่ พร้อมปุ่ม ดู/แก้ไข/ลบ/PDF) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>ประวัติการบันทึกน้ำหนัก-ส่วนสูง (แยกตามวันที่)</span>
          </h3>
          <span className="text-xs text-slate-500">บันทึกไว้แล้ว {records.length} ครั้ง</span>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 text-slate-400">
            <Activity className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">ยังไม่มีรายการบันทึกน้ำหนัก-ส่วนสูง</p>
            <button
              onClick={handleStartNewRecord}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              + บันทึกครั้งแรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((rec) => {
              const totalRecorded = rec.rows.filter((r) => r.weight && r.height).length;
              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        ภาคเรียนที่ {rec.term} / {rec.academicYear}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        บันทึก {totalRecorded} / {rec.rows.length} คน
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>{formatThaiDate(rec.date, true)}</span>
                    </h4>

                    {rec.note && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{rec.note}"</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPrintRecord(rec)}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 font-medium py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
                      title="ดาวน์โหลด PDF / พิมพ์รายงาน"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด PDF</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditRecord(rec)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="ดู / แก้ไขข้อมูล"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id, rec.date)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบชุดบันทึกนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable PDF Report Modal */}
      {printRecord && (
        <PrintReportModal
          isOpen={true}
          onClose={() => setPrintRecord(null)}
          title={`แบบบันทึกน้ำหนัก - ส่วนสูง และการประเมินภาวะโภชนาการ`}
          subtitle={`ประจำวันที่ ${formatThaiDate(printRecord.date, true)} • ภาคเรียนที่ ${printRecord.term} / ${printRecord.academicYear}`}
          profile={profile}
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
                <th className="border border-slate-400 p-2 text-center w-32">ภาวะโภชนาการ</th>
              </tr>
            </thead>
            <tbody>
              {printRecord.rows.map((row, i) => (
                <tr key={row.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-medium">{row.studentName || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{row.gender || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{row.age || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold">{row.weight || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold">{row.height || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold">{row.bmi || '-'}</td>
                  <td className="border border-slate-300 p-1.5 text-center">{row.status || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintReportModal>
      )}
    </div>
  );
};
