import React, { useState, useEffect } from 'react';
import {
  Student,
  CalendarEvent,
  TeacherProfile
} from '../types';
import { dataService } from '../services/dataService';
import { formatThaiDate, formatThaiDateTime, DEFAULT_DRIVE_FOLDER_ID } from '../utils/helpers';
import {
  Activity,
  Users,
  PiggyBank,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  CheckCircle2,
  TrendingUp,
  Clock,
  Pencil,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  isAdmin: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, isAdmin }) => {
  const [students, setStudents] = useState<Student[]>(dataService.getStudents());
  const [events, setEvents] = useState<CalendarEvent[]>(dataService.getCalendarEvents());
  const [profile, setProfile] = useState<TeacherProfile>(dataService.getProfile());

  // Calendar state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('11:00');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventColor, setNewEventColor] = useState<CalendarEvent['color']>('emerald');

  // Calendar day detail modal state (Req 4: pop-up เมื่อกดวันที่ เพื่อดูรายละเอียด แก้ไข หรือ ลบได้)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState<boolean>(false);
  const [isEditingEventInModal, setIsEditingEventInModal] = useState<boolean>(false);
  const [modalEditEventId, setModalEditEventId] = useState<string | null>(null);
  const [modalEventTitle, setModalEventTitle] = useState('');
  const [modalEventStartTime, setModalEventStartTime] = useState('09:00');
  const [modalEventEndTime, setModalEventEndTime] = useState('11:00');
  const [modalEventDesc, setModalEventDesc] = useState('');
  const [modalEventColor, setModalEventColor] = useState<CalendarEvent['color']>('emerald');
  const [showModalAddForm, setShowModalAddForm] = useState<boolean>(false);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setStudents(dataService.getStudents());
      setEvents(dataService.getCalendarEvents());
      setProfile(dataService.getProfile());
    });
    return unsub;
  }, []);

  // Calculate statistics
  const totalStudents = students.length;
  const totalSavings = students.reduce((sum: number, s) => sum + (s.currentSavings || 0), 0);
  const weightRecordsCount = dataService.getWeightHeightRecords().length;
  const scoreSheetsCount = dataService.getScoreSheets().length;

  // Attendance stats for today
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const allAtt = dataService.getAllAttendanceAndBank();
  const todayAttObj = allAtt[todayDateStr]?.attendance || {};
  const presentCount = Object.values(todayAttObj).filter(v => v === 'present').length || totalStudents;

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุชื่อกิจกรรม');
      return;
    }

    const eventObj: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle.trim(),
      date: newEventDate,
      startTime: newEventStartTime,
      endTime: newEventEndTime,
      description: newEventDesc.trim(),
      color: newEventColor,
      createdAt: new Date().toISOString(),
    };

    dataService.saveCalendarEvent(eventObj);
    setShowEventModal(false);
    setNewEventTitle('');
    setNewEventDesc('');
  };

  const handleDeleteEvent = (id: string) => {
    dataService.deleteCalendarEvent(id);
  };

  // Day Detail Modal Handlers (Req 4)
  const handleOpenDayDetail = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    setIsEditingEventInModal(false);
    setModalEditEventId(null);
    setShowModalAddForm(false);
    setShowDayDetailModal(true);
  };

  const handleStartEditEventInModal = (evt: CalendarEvent) => {
    setIsEditingEventInModal(true);
    setModalEditEventId(evt.id);
    setModalEventTitle(evt.title);
    setModalEventStartTime(evt.startTime || '09:00');
    setModalEventEndTime(evt.endTime || '11:00');
    setModalEventDesc(evt.description || '');
    setModalEventColor(evt.color || 'emerald');
    setShowModalAddForm(false);
  };

  const handleSaveEditEventInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditEventId || !modalEventTitle.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุชื่อกิจกรรม');
      return;
    }
    const existing = events.find((e) => e.id === modalEditEventId);
    if (!existing) return;

    const updatedEvent: CalendarEvent = {
      ...existing,
      title: modalEventTitle.trim(),
      startTime: modalEventStartTime,
      endTime: modalEventEndTime,
      description: modalEventDesc.trim(),
      color: modalEventColor,
    };

    dataService.saveCalendarEvent(updatedEvent);
    dataService.notifyToast('success', 'บันทึกการแก้ไขกิจกรรมแล้ว');
    setIsEditingEventInModal(false);
    setModalEditEventId(null);
    setShowDayDetailModal(false);
  };

  const handleStartAddEventInModal = () => {
    setIsEditingEventInModal(false);
    setModalEditEventId(null);
    setModalEventTitle('');
    setModalEventStartTime('09:00');
    setModalEventEndTime('11:00');
    setModalEventDesc('');
    setModalEventColor('emerald');
    setShowModalAddForm(true);
  };

  const handleSaveAddEventInModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalendarDate || !modalEventTitle.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุชื่อกิจกรรม');
      return;
    }

    const newEvt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: modalEventTitle.trim(),
      date: selectedCalendarDate,
      startTime: modalEventStartTime,
      endTime: modalEventEndTime,
      description: modalEventDesc.trim(),
      color: modalEventColor,
      createdAt: new Date().toISOString(),
    };

    dataService.saveCalendarEvent(newEvt);
    dataService.notifyToast('success', 'เพิ่มกิจกรรมในปฏิทินเรียบร้อย');
    setShowModalAddForm(false);
    setModalEventTitle('');
    setModalEventDesc('');
    setShowDayDetailModal(false);
  };

  const getColorClasses = (color: CalendarEvent['color']) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500 text-white';
      case 'teal':
        return 'bg-teal-500 text-white';
      case 'blue':
        return 'bg-blue-500 text-white';
      case 'amber':
        return 'bg-amber-500 text-white';
      case 'rose':
        return 'bg-rose-500 text-white';
      case 'purple':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Middle Layout: High Density Calendar & Classroom Summary/Recent Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar Column (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-emerald-50 rounded-2xl shadow-xs p-5 flex flex-col justify-between">
          <div>
            {/* Header: Title and Month controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                <span>ตารางปฏิทินกิจกรรม</span>
              </h2>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs sm:text-sm font-bold px-2 text-gray-800">
                  {formatThaiDate(new Date(year, month, 1)).replace(/^\d+\s+/, '')}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowEventModal(true)}
                  className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เพิ่มบันทึก</span>
                </button>
              </div>
            </div>

            {/* High Density Day Grid with gap-px */}
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-lg overflow-hidden flex-grow">
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">อา.</div>
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">จ.</div>
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">อ.</div>
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">พ.</div>
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">พฤ.</div>
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">ศ.</div>
              <div className="bg-gray-50 p-2 text-[10px] font-bold text-center text-gray-500 uppercase">ส.</div>

              {/* Empty slots before first day */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white p-2 min-h-[58px] opacity-30 text-xs" />
              ))}

              {/* Days of current month (Req 4: สามารถกดที่วันที่เพื่อดูรายละเอียด pop-up และแก้ไข หรือ ลบได้) */}
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = events.filter((e) => e.date === dateStr);
                const isToday = todayDateStr === dateStr;
                const isSunday = (firstDayIndex + i) % 7 === 0;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => handleOpenDayDetail(dateStr)}
                    className={`p-1.5 sm:p-2 min-h-[62px] text-xs font-semibold flex flex-col justify-between transition-all cursor-pointer group hover:bg-slate-50 relative ${
                      isToday
                        ? 'bg-emerald-50 text-emerald-700 font-bold ring-2 ring-emerald-500 ring-inset'
                        : 'bg-white text-gray-800'
                    }`}
                    title={`คลิกเพื่อดูรายละเอียด / แก้ไข / ลบกิจกรรมวันที่ ${dayNum} ${formatThaiDate(new Date(year, month, dayNum))}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`block text-[11px] font-bold ${isToday ? 'text-emerald-700' : isSunday ? 'text-rose-500' : 'text-slate-700'}`}>
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform" />
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden mt-1">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          title={`${evt.title} (${evt.startTime || ''})`}
                          className={`text-[8px] text-white p-0.5 rounded px-1 truncate font-medium ${getColorClasses(
                            evt.color
                          )}`}
                        >
                          {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[8px] text-gray-400 font-medium block">
                          +{dayEvents.length - 2} รายการ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Event List */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 mb-2">รายการกิจกรรมใกล้ถึง (คลิกเพื่อดู/แก้ไข)</h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {events.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">ยังไม่มีบันทึกกิจกรรมในปฏิทิน</p>
              ) : (
                events.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded-lg bg-gray-50/70 hover:bg-slate-100/80 border border-gray-100 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    onClick={() => handleOpenDayDetail(evt.date)}
                    title="คลิกเพื่อดูรายละเอียด / แก้ไข / ลบกิจกรรม"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getColorClasses(evt.color)}`} />
                      <span className="font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-md group-hover:text-emerald-700">
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        ({formatThaiDate(evt.date)}{evt.startTime ? ` ${evt.startTime}` : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedCalendarDate(evt.date);
                          handleStartEditEventInModal(evt);
                          setShowDayDetailModal(true);
                        }}
                        className="text-slate-400 hover:text-emerald-600 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                        title="แก้ไขกิจกรรม"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                        title="ลบกิจกรรม"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Classroom Summary & Recent Log Feed (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Card 1: สรุปข้อมูลห้องเรียน */}
          <div className="bg-white border border-emerald-50 rounded-2xl shadow-xs p-5 flex flex-col shrink-0">
            <h3 className="text-sm font-bold text-gray-900 mb-3">สรุปข้อมูลห้องเรียน</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">นักเรียนทั้งหมด</span>
                <span className="text-xs font-bold text-gray-800">{totalStudents} คน</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full"></div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-500">ยอดเงินฝากรวม</span>
                <span className="text-xs font-bold text-emerald-600">฿ {totalSavings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">มาเรียนวันนี้</span>
                <span className="text-xs font-bold text-blue-600">{presentCount}/{totalStudents} คน</span>
              </div>
            </div>
          </div>

          {/* Card 2: บันทึกล่าสุด */}
          <div className="bg-white border border-emerald-50 rounded-2xl shadow-xs p-5 flex flex-col flex-grow overflow-hidden">
            <h3 className="text-sm font-bold text-gray-900 mb-3">บันทึกล่าสุด</h3>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">อัปเดตน้ำหนัก-ส่วนสูง</p>
                  <p className="text-[10px] text-gray-500">บันทึกผลตามเกณฑ์ BMI ประจำภาคเรียน</p>
                  <p className="text-[9px] text-emerald-500 mt-0.5">ล่าสุด</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">บันทึกเงินฝากสะสม</p>
                  <p className="text-[10px] text-gray-500">เงินออมสะสมยอดรวม ฿ {totalSavings.toLocaleString()}</p>
                  <p className="text-[9px] text-emerald-500 mt-0.5">ประจำวัน</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">ลงคะแนนสอบและตัดเกรด</p>
                  <p className="text-[10px] text-gray-500">วิชาคณิตศาสตร์เบื้องต้น (ค16101)</p>
                  <p className="text-[9px] text-emerald-500 mt-0.5">ระบบคำนวณอัตโนมัติ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-emerald-50">
            <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <span>เพิ่มบันทึกกิจกรรมส่วนตัว</span>
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">ชื่อกิจกรรม / การนัดหมาย</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="เช่น ประชุมผู้ปกครอง, ส่งข้อสอบ..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 text-xs outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">สีไฮไลท์</label>
                  <select
                    value={newEventColor}
                    onChange={(e) => setNewEventColor(e.target.value as CalendarEvent['color'])}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 text-xs outline-hidden"
                  >
                    <option value="emerald">สีเขียว (ทั่วไป)</option>
                    <option value="blue">สีฟ้า (วิชาการ)</option>
                    <option value="amber">สีส้ม (กิจกรรม)</option>
                    <option value="rose">สีชมพู (สำคัญ)</option>
                    <option value="purple">สีม่วง (พิเศษ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={newEventStartTime}
                    onChange={(e) => setNewEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 text-xs outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={newEventEndTime}
                    onChange={(e) => setNewEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 text-xs outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="เช่น สถานที่ หรือสิ่งที่ต้องเตรียม..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 text-xs outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                >
                  บันทึกกิจกรรม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAY DETAIL POP-UP MODAL (Req 4: กดที่วันที่เพื่อดูรายละเอียด pop-up และแก้ไข หรือ ลบได้) */}
      {showDayDetailModal && selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {formatThaiDate(selectedCalendarDate, true)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    บันทึกกิจกรรมประจำวัน ({events.filter((e) => e.date === selectedCalendarDate).length} รายการ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDayDetailModal(false);
                  setIsEditingEventInModal(false);
                  setShowModalAddForm(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(92vh-140px)] space-y-4">
              {/* Case 1: Editing an Event */}
              {isEditingEventInModal && modalEditEventId ? (
                <form onSubmit={handleSaveEditEventInModal} className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                      <span>แก้ไขกิจกรรม</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingEventInModal(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อกิจกรรม *</label>
                    <input
                      type="text"
                      required
                      value={modalEventTitle}
                      onChange={(e) => setModalEventTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs outline-hidden"
                      placeholder="เช่น สอบกลางภาค, กิจกรรมวันเด็ก..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">เวลาเริ่ม</label>
                      <input
                        type="time"
                        value={modalEventStartTime}
                        onChange={(e) => setModalEventStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        value={modalEventEndTime}
                        onChange={(e) => setModalEventEndTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">สีแถบกิจกรรม</label>
                    <select
                      value={modalEventColor}
                      onChange={(e) => setModalEventColor(e.target.value as CalendarEvent['color'])}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden"
                    >
                      <option value="emerald">สีเขียว (ทั่วไป/สำเร็จ)</option>
                      <option value="blue">สีฟ้า (วิชาการ)</option>
                      <option value="amber">สีส้ม (แจ้งเตือน)</option>
                      <option value="rose">สีชมพู (สำคัญ)</option>
                      <option value="purple">สีม่วง (พิเศษ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียด / สถานที่</label>
                    <textarea
                      value={modalEventDesc}
                      onChange={(e) => setModalEventDesc(e.target.value)}
                      placeholder="รายละเอียดเพิ่มเติม เช่น อาคารเรียน สิ่งที่ต้องเตรียม..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingEventInModal(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      บันทึกการแก้ไข
                    </button>
                  </div>
                </form>
              ) : showModalAddForm ? (
                /* Case 2: Adding a New Event for This Date */
                <form onSubmit={handleSaveAddEventInModal} className="space-y-3.5 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>เพิ่มกิจกรรมสำหรับวันที่ {formatThaiDate(selectedCalendarDate)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModalAddForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อกิจกรรม *</label>
                    <input
                      type="text"
                      required
                      value={modalEventTitle}
                      onChange={(e) => setModalEventTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs outline-hidden"
                      placeholder="เช่น สอนชดเชย, นำเสนอผลงาน..."
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">เวลาเริ่ม</label>
                      <input
                        type="time"
                        value={modalEventStartTime}
                        onChange={(e) => setModalEventStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">เวลาสิ้นสุด</label>
                      <input
                        type="time"
                        value={modalEventEndTime}
                        onChange={(e) => setModalEventEndTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">สีแถบกิจกรรม</label>
                    <select
                      value={modalEventColor}
                      onChange={(e) => setModalEventColor(e.target.value as CalendarEvent['color'])}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden"
                    >
                      <option value="emerald">สีเขียว (ทั่วไป/สำเร็จ)</option>
                      <option value="blue">สีฟ้า (วิชาการ)</option>
                      <option value="amber">สีส้ม (แจ้งเตือน)</option>
                      <option value="rose">สีชมพู (สำคัญ)</option>
                      <option value="purple">สีม่วง (พิเศษ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียด / สถานที่</label>
                    <textarea
                      value={modalEventDesc}
                      onChange={(e) => setModalEventDesc(e.target.value)}
                      placeholder="รายละเอียดเพิ่มเติม เช่น สถานที่ หรือสิ่งที่ต้องนำมา..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 text-xs outline-hidden resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowModalAddForm(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      บันทึกกิจกรรม
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Case 3: List of Events for This Date */}
              {(() => {
                const dayEvents = events.filter((e) => e.date === selectedCalendarDate);
                if (dayEvents.length === 0 && !showModalAddForm && !isEditingEventInModal) {
                  return (
                    <div className="text-center py-8 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl space-y-2.5">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">ไม่มีกิจกรรมในวันนี้</p>
                      <p className="text-[11px] text-slate-500">
                        ท่านสามารถคลิกปุ่มด้านล่างเพื่อเพิ่มกิจกรรมหรือนัดหมายใหม่ในวันดังกล่าวได้
                      </p>
                      <button
                        type="button"
                        onClick={handleStartAddEventInModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มกิจกรรมในวันนี้</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${getColorClasses(evt.color)}`} />
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {evt.title}
                              </h4>
                              {(evt.startTime || evt.endTime) && (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>
                                    {evt.startTime || '00:00'} - {evt.endTime || '23:59'} น.
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons: Edit and Delete (Req 4: สามารถแก้ไข หรือ ลบ ได้) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditEventInModal(evt)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/60 transition-colors cursor-pointer"
                              title="แก้ไขกิจกรรมนี้"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>แก้ไข</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบกิจกรรมนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {evt.description && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1 whitespace-pre-wrap">
                            {evt.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between">
              {!showModalAddForm && !isEditingEventInModal ? (
                <button
                  type="button"
                  onClick={handleStartAddEventInModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มกิจกรรมในวันนี้</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => {
                  setShowDayDetailModal(false);
                  setIsEditingEventInModal(false);
                  setShowModalAddForm(false);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
