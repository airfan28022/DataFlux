import React, { useState, useEffect } from 'react';
import { Student, DynamicField, TeacherProfile } from '../types';
import { dataService } from '../services/dataService';
import { calculateAge, formatThaiDate } from '../utils/helpers';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { PrintReportModal } from '../components/PrintReportModal';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Eye,
  Search,
  Printer,
  Phone,
  Coins,
  Bus,
  Home,
  Briefcase,
  User,
  Calendar,
  X,
  Upload,
  Heart,
  Droplet,
  Tag
} from 'lucide-react';

interface StudentRecordsViewProps {
  isAdmin: boolean;
}

export const StudentRecordsView: React.FC<StudentRecordsViewProps> = ({ isAdmin }) => {
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Detail modal state
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  // Print report modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Form Fields
  const [prefix, setPrefix] = useState<Student['prefix']>('เด็กชาย');
  const [studentCode, setStudentCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('2014-01-01');
  const [age, setAge] = useState<number>(12);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [livesWith, setLivesWith] = useState('บิดา-มารดา');
  const [commuteMethod, setCommuteMethod] = useState('รถโรงเรียน');
  const [dailyAllowance, setDailyAllowance] = useState<number>(50);
  const [parentOccupation, setParentOccupation] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodType, setBloodType] = useState('O');
  const [chronicDisease, setChronicDisease] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setStudents(dataService.getStudents());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  // Recalculate age when birth date changes
  useEffect(() => {
    if (birthDate) {
      setAge(calculateAge(birthDate));
    }
  }, [birthDate]);

  // Handle student photo file upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dataService.notifyToast('warning', 'กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      dataService.notifyToast('warning', 'ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
        dataService.notifyToast('success', 'อัปโหลดรูปภาพสำเร็จ', 'เพิ่มรูปภาพของนักเรียนเรียบร้อยแล้ว');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateModal = () => {
    setEditingStudent(null);
    const nextCode = `501${String(students.length + 1).padStart(2, '0')}`;
    setStudentCode(nextCode);
    setPrefix('เด็กชาย');
    setFirstName('');
    setLastName('');
    setNickname('');
    setBirthDate('2014-05-15');
    setAge(12);
    setGender('male');
    setLivesWith('บิดา-มารดา');
    setCommuteMethod('รถโรงเรียน');
    setDailyAllowance(50);
    setParentOccupation('');
    setParentPhone('');
    setAddress('');
    setBloodType('O');
    setChronicDisease('');
    setPhotoUrl('');
    setDynamicFields([]);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setStudentCode(student.studentCode || '');
    setPrefix(student.prefix);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setNickname(student.nickname || '');
    setBirthDate(student.birthDate || '2014-01-01');
    setAge(student.age || calculateAge(student.birthDate));
    setGender(student.gender || 'male');
    setLivesWith(student.livesWith || 'บิดา-มารดา');
    setCommuteMethod(student.commuteMethod || 'เดิน');
    setDailyAllowance(student.dailyAllowance || 0);
    setParentOccupation(student.parentOccupation || '');
    setParentPhone(student.parentPhone || '');
    setAddress(student.address || '');
    setBloodType(student.bloodType || 'O');
    setChronicDisease(student.chronicDisease || '');
    setPhotoUrl(student.photoUrl || '');
    setDynamicFields(student.dynamicFields ? [...student.dynamicFields] : []);
    setShowFormModal(true);
  };

  const handleAddDynamicField = () => {
    setDynamicFields([
      ...dynamicFields,
      { id: `df-${Date.now()}`, label: 'หัวข้อข้อมูลเพิ่มเติม', value: '' },
    ]);
  };

  const handleRemoveDynamicField = (id: string) => {
    setDynamicFields(dynamicFields.filter((df) => df.id !== id));
  };

  const handleDynamicFieldChange = (id: string, field: 'label' | 'value', text: string) => {
    setDynamicFields(
      dynamicFields.map((df) => (df.id === id ? { ...df, [field]: text } : df))
    );
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุชื่อและนามสกุลนักเรียน');
      return;
    }

    const payload: Student = {
      id: editingStudent ? editingStudent.id : `std-${Date.now()}`,
      studentCode: studentCode || `501${String(students.length + 1).padStart(2, '0')}`,
      prefix,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim(),
      birthDate,
      age: Number(age) || calculateAge(birthDate),
      gender,
      livesWith,
      commuteMethod,
      dailyAllowance: Number(dailyAllowance) || 0,
      parentOccupation: parentOccupation.trim(),
      parentPhone: parentPhone.trim(),
      address: address.trim(),
      bloodType,
      chronicDisease: chronicDisease.trim(),
      photoUrl: photoUrl.trim(),
      dynamicFields,
      currentSavings: editingStudent ? editingStudent.currentSavings : 0,
      createdAt: editingStudent ? editingStudent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataService.saveStudent(payload);
    setShowFormModal(false);
  };

  const handleDeleteStudent = (student: Student) => {
    dataService.showAlert({
      type: 'warning',
      title: 'ยืนยันการลบข้อมูลนักเรียน?',
      text: `คุณต้องการลบข้อมูล "${student.prefix}${student.firstName} ${student.lastName}" ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      onConfirm: () => {
        dataService.deleteStudent(student.id);
        if (detailStudent?.id === student.id) {
          setDetailStudent(null);
        }
      },
    });
  };

  // Search filter
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.nickname.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.parentOccupation?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-emerald-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">ข้อมูลนักเรียน (Student Records)</h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                PAGE 2
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ทะเบียนประวัตินักเรียน การติดต่อ ผู้ปกครอง การเดินทาง ค่าขนม และฟิลด์กำหนดเอง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="พิมพ์บัญชีรายชื่อนักเรียน"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด PDF</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มข้อมูลนักเรียน</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาด้วยชื่อ, นามสกุล, ชื่อเล่น หรือรหัสนักเรียน..."
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200/90 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-sm outline-hidden shadow-2xs"
        />
      </div>

      {/* Students Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 text-slate-400">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">ไม่พบข้อมูลนักเรียนที่ค้นหา</p>
          </div>
        ) : (
          filteredStudents.map((student, idx) => (
            <div
              key={student.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="flex items-start gap-4">
                  {/* Avatar Photo with Google Drive Fallback */}
                  <div
                    onClick={() => setDetailStudent(student)}
                    className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-teal-100 bg-slate-50 cursor-pointer shadow-xs group-hover:scale-105 transition-transform"
                  >
                    <ImageWithFallback
                      src={student.photoUrl}
                      alt={student.firstName}
                      isAvatar={true}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        #{student.studentCode || idx + 1}
                      </span>
                      {student.nickname && (
                        <span className="text-xs font-semibold text-slate-500">
                          ({student.nickname})
                        </span>
                      )}
                    </div>
                    <h3
                      onClick={() => setDetailStudent(student)}
                      className="text-base font-bold text-slate-800 truncate hover:text-teal-700 cursor-pointer transition-colors mt-0.5"
                    >
                      {student.prefix}{student.firstName} {student.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      อายุ {student.age} ปี • เพศ {student.gender === 'male' ? 'ชาย' : 'หญิง'}
                    </p>
                  </div>
                </div>

                {/* Quick Info Tags */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">อยู่กับ: {student.livesWith || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">เดินทาง: {student.commuteMethod || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>ค่าขนม {student.dailyAllowance} ฿</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{student.parentOccupation || 'ไม่ระบุ'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Controls */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailStudent(student)}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 py-1 px-2 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ดูรายละเอียด</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(student)}
                    className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer"
                    title="แก้ไขข้อมูลนักเรียน"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(student)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="ลบข้อมูลนักเรียน"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DETAIL MODAL (รายละเอียดเชิงลึก) */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/80 bg-white/20 shrink-0 shadow-md">
                  <ImageWithFallback
                    src={detailStudent.photoUrl}
                    alt={detailStudent.firstName}
                    isAvatar={true}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold bg-white/20 px-2.5 py-0.5 rounded-full">
                    รหัสนักเรียน #{detailStudent.studentCode}
                  </span>
                  <h3 className="text-xl font-bold mt-1">
                    {detailStudent.prefix}{detailStudent.firstName} {detailStudent.lastName}
                  </h3>
                  <p className="text-xs text-teal-100">ชื่อเล่น: {detailStudent.nickname || '-'}</p>
                </div>
              </div>

              <button
                onClick={() => setDetailStudent(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">วันเดือนปีเกิด</span>
                  <span className="font-semibold text-slate-800">
                    {formatThaiDate(detailStudent.birthDate)} (อายุ {detailStudent.age} ปี)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">หมู่โลหิต</span>
                  <span className="font-semibold text-slate-800">{detailStudent.bloodType || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">โรคประจำตัว/แพ้ยา</span>
                  <span className="font-semibold text-slate-800">{detailStudent.chronicDisease || 'ไม่มี'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">เงินออมสะสม</span>
                  <span className="font-bold text-emerald-700">{detailStudent.currentSavings} บาท</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-teal-600" /> ข้อมูลความเป็นอยู่และการเดินทาง
                </h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <p className="text-slate-700">
                    <span className="text-slate-400">อาศัยอยู่กับ:</span> {detailStudent.livesWith}
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-400">วิธีเดินทางมาโรงเรียน:</span> {detailStudent.commuteMethod}
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-400">ค่าขนมต่อวัน:</span> {detailStudent.dailyAllowance} บาท
                  </p>
                  {detailStudent.address && (
                    <p className="text-slate-700">
                      <span className="text-slate-400">ที่อยู่:</span> {detailStudent.address}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-teal-600" /> ข้อมูลผู้ปกครองและการติดต่อ
                </h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <p className="text-slate-700">
                    <span className="text-slate-400">อาชีพผู้ปกครอง:</span> {detailStudent.parentOccupation || '-'}
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-400">เบอร์โทรศัพท์:</span> {detailStudent.parentPhone || '-'}
                  </p>
                </div>
              </div>

              {/* Dynamic custom fields */}
              {detailStudent.dynamicFields && detailStudent.dynamicFields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-teal-600" /> ข้อมูลเพิ่มเติม
                  </h4>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    {detailStudent.dynamicFields.map((df) => (
                      <p key={df.id} className="text-slate-700">
                        <span className="text-slate-400">{df.label}:</span> {df.value || '-'}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteStudent(detailStudent)}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบนักเรียน</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(detailStudent);
                    setDetailStudent(null);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-medium shadow-xs flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>แก้ไขข้อมูล</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT STUDENT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-teal-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-600 text-white rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มข้อมูลนักเรียนใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500">กรอกข้อมูลประวัติและข้อมูลสำหรับดูแลนักเรียน</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveStudent} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">คำนำหน้า</label>
                  <select
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value as Student['prefix'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden bg-white"
                  >
                    <option value="เด็กชาย">เด็กชาย</option>
                    <option value="เด็กหญิง">เด็กหญิง</option>
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="เช่น กิตติศักดิ์"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="เช่น รักษ์ความดี"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="เช่น ภูมิ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">วันเดือนปีเกิด</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อายุ (คำนวณอัตโนมัติ)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อาศัยอยู่กับใคร</label>
                  <input
                    type="text"
                    value={livesWith}
                    onChange={(e) => setLivesWith(e.target.value)}
                    placeholder="เช่น บิดา-มารดา, ปู่ย่า"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เดินทางมาโรงเรียนอย่างไร</label>
                  <input
                    type="text"
                    value={commuteMethod}
                    onChange={(e) => setCommuteMethod(e.target.value)}
                    placeholder="เช่น รถโรงเรียน, เดิน, มอเตอร์ไซค์"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ค่าขนมต่อวัน (บาท)</label>
                  <input
                    type="number"
                    value={dailyAllowance}
                    onChange={(e) => setDailyAllowance(Number(e.target.value))}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อาชีพผู้ปกครอง</label>
                  <input
                    type="text"
                    value={parentOccupation}
                    onChange={(e) => setParentOccupation(e.target.value)}
                    placeholder="เช่น รับจ้าง, ค้าขาย, ข้าราชการ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ผู้ปกครอง</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 text-xs outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>รูปถ่ายนักเรียน (อัปโหลดไฟล์รูปภาพ)</span>
                  {photoUrl && (
                    <span className="text-[11px] text-teal-600 font-normal">อัปโหลดเรียบร้อยแล้ว</span>
                  )}
                </label>

                {photoUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-2xs">
                      <img
                        src={photoUrl}
                        alt="ตัวอย่างรูปนักเรียน"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-slate-800">มีรูปภาพแล้ว</p>
                      <p className="text-[11px] text-slate-500">สามารถคลิกเพื่อเปลี่ยนรูป หรือลบรูปภาพออกได้</p>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs">
                          <Upload className="w-3 h-3" />
                          <span>เปลี่ยนรูปภาพ</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          ลบรูปภาพ
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700 group-hover:text-teal-700">
                        คลิกเพื่อเลือกไฟล์รูปภาพ หรือลากรูปมาวางที่นี่
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        รองรับไฟล์ JPG, PNG, WEBP (แปลงเป็นไฟล์จัดเก็บอัตโนมัติ)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Dynamic custom fields section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    ช่องข้อมูลเพิ่มเติมแบบ Dynamic (ไม่บังคับกรอกทุกช่อง)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDynamicField}
                    className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มฟิลด์ใหม่</span>
                  </button>
                </div>

                {dynamicFields.map((df) => (
                  <div key={df.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={df.label}
                      onChange={(e) => handleDynamicFieldChange(df.id, 'label', e.target.value)}
                      placeholder="ชื่อหัวข้อ (เช่น ความสามารถพิเศษ)"
                      className="w-1/3 px-3 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 text-xs"
                    />
                    <input
                      type="text"
                      value={df.value}
                      onChange={(e) => handleDynamicFieldChange(df.id, 'value', e.target.value)}
                      placeholder="ข้อมูล"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDynamicField(df.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                      title="ลบฟิลด์นี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-sm shadow-teal-200"
                >
                  บันทึกข้อมูลนักเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT STUDENT LIST PDF */}
      <PrintReportModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="ทะเบียนประวัติและข้อมูลนักเรียนประจำชั้น"
        subtitle={`รวมนักเรียนทั้งหมด ${students.length} คน`}
        profile={profile}
      >
        <table className="w-full border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-400 font-bold">
              <th className="border border-slate-400 p-2 text-center w-12">ลำดับ</th>
              <th className="border border-slate-400 p-2 text-center w-20">รหัส</th>
              <th className="border border-slate-400 p-2 text-left">ชื่อ - นามสกุล (ชื่อเล่น)</th>
              <th className="border border-slate-400 p-2 text-center w-14">อายุ</th>
              <th className="border border-slate-400 p-2 text-left">อาศัยอยู่กับ</th>
              <th className="border border-slate-400 p-2 text-left">การเดินทาง</th>
              <th className="border border-slate-400 p-2 text-center w-20">ค่าขนม</th>
              <th className="border border-slate-400 p-2 text-left">อาชีพผู้ปกครอง</th>
              <th className="border border-slate-400 p-2 text-left">เบอร์ติดต่อ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} className="border-b border-slate-300">
                <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                <td className="border border-slate-300 p-1.5 text-center">{s.studentCode}</td>
                <td className="border border-slate-300 p-1.5 font-medium">
                  {s.prefix}{s.firstName} {s.lastName} {s.nickname ? `(${s.nickname})` : ''}
                </td>
                <td className="border border-slate-300 p-1.5 text-center">{s.age}</td>
                <td className="border border-slate-300 p-1.5">{s.livesWith}</td>
                <td className="border border-slate-300 p-1.5">{s.commuteMethod}</td>
                <td className="border border-slate-300 p-1.5 text-center font-semibold">{s.dailyAllowance} ฿</td>
                <td className="border border-slate-300 p-1.5">{s.parentOccupation || '-'}</td>
                <td className="border border-slate-300 p-1.5">{s.parentPhone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReportModal>
    </div>
  );
};
