import React, { useState, useEffect } from 'react';
import {
  Student,
  CalendarEvent,
  TeacherProfile,
  DashboardNote
} from '../types';
import { dataService } from '../services/dataService';
import { formatThaiDate, formatThaiDateTime } from '../utils/helpers';
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
  Sparkles,
  Pin,
  Star,
  Lightbulb,
  Bell,
  AlertCircle,
  BookOpen,
  Tag,
  Target,
  MessageSquare,
  Heart,
  StickyNote,
  Check
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

  // Quick Notes state (สมุดโน๊ตบันทึกด่วน)
  const [notes, setNotes] = useState<DashboardNote[]>(dataService.getNotes());
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteFontWeight, setNoteFontWeight] = useState<'normal' | 'semibold' | 'bold'>('semibold');
  const [noteIcon, setNoteIcon] = useState<string>('pin');
  const [noteColor, setNoteColor] = useState<DashboardNote['color']>('amber');

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setStudents(dataService.getStudents());
      setEvents(dataService.getCalendarEvents());
      setProfile(dataService.getProfile());
      setNotes(dataService.getNotes());
    });
    return unsub;
  }, []);

  const todayDateStr = new Date().toISOString().slice(0, 10);

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

  // Note Handlers & Helpers
  const NOTE_ICONS = [
    { id: 'pin', label: 'หมุด', icon: Pin },
    { id: 'star', label: 'ดาว', icon: Star },
    { id: 'lightbulb', label: 'ไอเดีย', icon: Lightbulb },
    { id: 'pencil', label: 'โน๊ต', icon: Pencil },
    { id: 'bell', label: 'เตือน', icon: Bell },
    { id: 'alert', label: 'ด่วน', icon: AlertCircle },
    { id: 'check', label: 'สำเร็จ', icon: CheckCircle2 },
    { id: 'book', label: 'วิชาการ', icon: BookOpen },
    { id: 'tag', label: 'แท็ก', icon: Tag },
    { id: 'target', label: 'เป้าหมาย', icon: Target },
    { id: 'message', label: 'ข้อความ', icon: MessageSquare },
    { id: 'heart', label: 'สำคัญ', icon: Heart },
  ];

  const NOTE_COLORS: Array<{ id: DashboardNote['color']; label: string; dot: string; bg: string }> = [
    { id: 'amber', label: 'เหลือง/ส้ม', dot: 'bg-amber-400', bg: 'bg-amber-50 border-amber-300 text-amber-800' },
    { id: 'emerald', label: 'เขียว', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
    { id: 'blue', label: 'ฟ้า', dot: 'bg-sky-500', bg: 'bg-sky-50 border-sky-300 text-sky-800' },
    { id: 'rose', label: 'ชมพู', dot: 'bg-rose-500', bg: 'bg-rose-50 border-rose-300 text-rose-800' },
    { id: 'purple', label: 'ม่วง', dot: 'bg-purple-500', bg: 'bg-purple-50 border-purple-300 text-purple-800' },
    { id: 'slate', label: 'เทา', dot: 'bg-slate-500', bg: 'bg-slate-50 border-slate-300 text-slate-800' },
  ];

  const renderNoteIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'pin':
        return <Pin className={className} />;
      case 'star':
        return <Star className={className} />;
      case 'lightbulb':
        return <Lightbulb className={className} />;
      case 'pencil':
        return <Pencil className={className} />;
      case 'bell':
        return <Bell className={className} />;
      case 'alert':
        return <AlertCircle className={className} />;
      case 'check':
        return <CheckCircle2 className={className} />;
      case 'book':
        return <BookOpen className={className} />;
      case 'tag':
        return <Tag className={className} />;
      case 'target':
        return <Target className={className} />;
      case 'message':
        return <MessageSquare className={className} />;
      case 'heart':
        return <Heart className={className} />;
      default:
        return <StickyNote className={className} />;
    }
  };

  const getNoteColorStyles = (color: DashboardNote['color']) => {
    switch (color) {
      case 'amber':
        return {
          cardBg: 'bg-amber-50/75 hover:bg-amber-50 border-amber-200/90',
          badge: 'bg-amber-100 text-amber-800 border border-amber-300/60',
          accent: 'text-amber-700',
        };
      case 'emerald':
        return {
          cardBg: 'bg-emerald-50/75 hover:bg-emerald-50 border-emerald-200/90',
          badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300/60',
          accent: 'text-emerald-700',
        };
      case 'blue':
        return {
          cardBg: 'bg-sky-50/75 hover:bg-sky-50 border-sky-200/90',
          badge: 'bg-sky-100 text-sky-800 border border-sky-300/60',
          accent: 'text-sky-700',
        };
      case 'rose':
        return {
          cardBg: 'bg-rose-50/75 hover:bg-rose-50 border-rose-200/90',
          badge: 'bg-rose-100 text-rose-800 border border-rose-300/60',
          accent: 'text-rose-700',
        };
      case 'purple':
        return {
          cardBg: 'bg-purple-50/75 hover:bg-purple-50 border-purple-200/90',
          badge: 'bg-purple-100 text-purple-800 border border-purple-300/60',
          accent: 'text-purple-700',
        };
      case 'slate':
      default:
        return {
          cardBg: 'bg-slate-50/90 hover:bg-slate-100/80 border-slate-200',
          badge: 'bg-slate-200/80 text-slate-800 border border-slate-300/60',
          accent: 'text-slate-700',
        };
    }
  };

  const getFontWeightClass = (weight?: 'normal' | 'semibold' | 'bold') => {
    switch (weight) {
      case 'normal':
        return 'font-normal';
      case 'semibold':
        return 'font-semibold';
      case 'bold':
        return 'font-bold';
      default:
        return 'font-semibold';
    }
  };

  const formatNoteTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
    if (isSameDay) {
      return `วันนี้ ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `เมื่อวาน ${timeStr}`;
    }
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${timeStr}`;
  };

  const handleOpenAddNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteFontWeight('semibold');
    setNoteIcon('pin');
    setNoteColor('amber');
    setShowNoteModal(true);
  };

  const handleOpenEditNote = (note: DashboardNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || '');
    setNoteContent(note.content || '');
    setNoteFontWeight(note.fontWeight || 'semibold');
    setNoteIcon(note.icon || 'pin');
    setNoteColor(note.color || 'amber');
    setShowNoteModal(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) {
      dataService.notifyToast('warning', 'กรุณาระบุหัวข้อหรือข้อความในโน๊ต');
      return;
    }

    const existingNote = editingNoteId ? notes.find((n) => n.id === editingNoteId) : null;

    const noteObj: DashboardNote = {
      id: editingNoteId || `note-${Date.now()}`,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      fontWeight: noteFontWeight,
      icon: noteIcon,
      color: noteColor,
      isPinned: existingNote ? !!existingNote.isPinned : false,
      createdAt: existingNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataService.saveNote(noteObj);
    setShowNoteModal(false);
  };

  const handleDeleteNote = (id: string) => {
    dataService.deleteNote(id);
    if (editingNoteId === id) {
      setShowNoteModal(false);
    }
  };

  const handleTogglePin = (id: string) => {
    dataService.togglePinNote(id);
  };

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-8 w-full max-w-full min-w-0">
      {/* Middle Layout: High Density Calendar & Classroom Summary/Recent Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5">
        {/* Calendar Column (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-2.5 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Header: Title and Month controls */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-1">
              <h2 className="font-bold text-gray-900 text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 truncate">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span className="truncate">ตารางปฏิทินกิจกรรม</span>
              </h2>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs sm:text-sm font-bold px-1 sm:px-2 text-gray-800 whitespace-nowrap">
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
                  className="ml-1 sm:ml-2 flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เพิ่มบันทึก</span>
                </button>
              </div>
            </div>

            {/* High Density Day Grid with gap-px */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden flex-grow">
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">อา.</div>
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">จ.</div>
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">อ.</div>
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">พ.</div>
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">พฤ.</div>
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">ศ.</div>
              <div className="bg-slate-50 py-1.5 px-0.5 sm:p-2 text-[10px] sm:text-xs font-bold text-center text-slate-600">ส.</div>

              {/* Empty slots before first day */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white/60 p-1 sm:p-2 min-h-[44px] sm:min-h-[58px] opacity-30 text-xs" />
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
                    className={`p-1 sm:p-2 min-h-[46px] sm:min-h-[62px] text-xs font-semibold flex flex-col justify-between transition-all cursor-pointer group hover:bg-slate-50 relative ${
                      isToday
                        ? 'bg-emerald-50 text-emerald-700 font-bold ring-2 ring-emerald-500 ring-inset'
                        : 'bg-white text-gray-800'
                    }`}
                    title={`คลิกเพื่อดูรายละเอียด / แก้ไข / ลบกิจกรรมวันที่ ${dayNum} ${formatThaiDate(new Date(year, month, dayNum))}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`block text-[10px] sm:text-[11px] font-bold ${isToday ? 'text-emerald-700' : isSunday ? 'text-rose-500' : 'text-slate-700'}`}>
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform" />
                      )}
                    </div>

                    <div className="space-y-0.5 overflow-hidden mt-0.5">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          title={`${evt.title} (${evt.startTime || ''})`}
                          className={`text-[8px] sm:text-[9px] text-white p-0.5 rounded px-1 truncate font-medium ${getColorClasses(
                            evt.color
                          )}`}
                        >
                          {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[7px] sm:text-[8px] text-gray-400 font-medium block">
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
          <div className="mt-3.5 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 mb-2">รายการกิจกรรมใกล้ถึง (คลิกเพื่อดู/แก้ไข)</h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {events.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">ยังไม่มีบันทึกกิจกรรมในปฏิทิน</p>
              ) : (
                events.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/60 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    onClick={() => handleOpenDayDetail(evt.date)}
                    title="คลิกเพื่อดูรายละเอียด / แก้ไข / ลบกิจกรรม"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-1 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getColorClasses(evt.color)}`} />
                      <span className="font-semibold text-gray-800 truncate group-hover:text-emerald-700">
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 hidden xs:inline">
                        ({formatThaiDate(evt.date)}{evt.startTime ? ` ${evt.startTime}` : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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

        {/* Right Column: Quick Notes / สมุดโน๊ตบันทึก (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-3.5 sm:p-5 h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
                <StickyNote className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span>สมุดโน๊ตบันทึก</span>
                  {notes.filter((n) => n.isPinned).length > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200/60">
                      <Pin className="w-2.5 h-2.5 fill-amber-500" />
                      {notes.filter((n) => n.isPinned).length}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                  <span>{notes.length} รายการ (คลิกเพื่อดู/แก้ไข)</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    เชื่อมต่อ Google Sheets
                  </span>
                </p>
              </div>
            </div>

            {/* "+" Icon Button */}
            <button
              type="button"
              onClick={handleOpenAddNote}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="เพิ่มโน๊ตใหม่ (+)"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">เพิ่มโน๊ต</span>
            </button>
          </div>

          {/* Compact Notes List */}
          <div className="mt-3 flex-grow overflow-y-auto max-h-[580px] space-y-2 pr-1">
            {notes.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2.5">
                  <StickyNote className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">ยังไม่มีบันทึกโน๊ต</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px] mx-auto">
                  กดปุ่ม "+" เพื่อจดบันทึกข้อความด่วน
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddNote}
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มโน๊ตข้อความแรก</span>
                </button>
              </div>
            ) : (
              notes.map((note) => {
                const colorStyle = getNoteColorStyles(note.color);
                return (
                  <div
                    key={note.id}
                    onClick={() => handleOpenEditNote(note)}
                    className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-xs relative flex flex-col gap-1.5 ${colorStyle.cardBg} ${
                      note.isPinned ? 'ring-1 ring-amber-400/70 shadow-2xs' : ''
                    }`}
                    title="คลิกเพื่อดูและแก้ไขข้อความ"
                  >
                    {/* Top Row: Icon badge, Title, Pin toggle, Delete */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${colorStyle.badge}`}
                          title={`ไอคอน: ${note.icon}`}
                        >
                          {renderNoteIcon(note.icon, 'w-3.5 h-3.5')}
                        </div>
                        <span
                          className={`text-xs text-slate-900 truncate flex-1 ${getFontWeightClass(
                            note.fontWeight
                          )}`}
                        >
                          {note.title || 'โน๊ตไม่มีหัวข้อ'}
                        </span>
                      </div>

                      {/* Action buttons on card */}
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Pin Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePin(note.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            note.isPinned
                              ? 'text-amber-600 bg-amber-100 hover:bg-amber-200 ring-1 ring-amber-300'
                              : 'text-slate-400 hover:text-amber-600 hover:bg-white/80'
                          }`}
                          title={note.isPinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุด'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500 text-amber-600' : ''}`} />
                        </button>

                        {/* Quick Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
                          title="ลบโน๊ตนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content preview with selected font weight */}
                    {note.content && (
                      <p
                        className={`text-[11px] text-slate-600 line-clamp-2 leading-relaxed pl-8 whitespace-pre-line ${getFontWeightClass(
                          note.fontWeight
                        )}`}
                      >
                        {note.content}
                      </p>
                    )}

                    {/* Footer Row: Timestamp & Pinned badge / hint */}
                    <div className="flex items-center justify-between pl-8 pt-0.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        {note.isPinned && (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 font-bold bg-amber-100/90 px-1 py-0.2 rounded">
                            <Pin className="w-2.5 h-2.5 fill-amber-600" />
                            ปักหมุด
                          </span>
                        )}
                        <span>{formatNoteTime(note.updatedAt || note.createdAt)}</span>
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 text-emerald-600 font-semibold flex items-center gap-0.5 transition-opacity">
                        ดู/แก้ไข <Pencil className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl border border-slate-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
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

      {/* Note View & Edit Modal (ดู / แก้ไข / บันทึกโน๊ต) */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-2xs">
                  {renderNoteIcon(noteIcon, 'w-4 h-4')}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {editingNoteId ? 'ดูและแก้ไขบันทึกโน๊ต' : 'เพิ่มบันทึกโน๊ตใหม่'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    พิมพ์ข้อความ และเลือกไอคอนประจำโน๊ต
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable form) */}
            <form onSubmit={handleSaveNote} className="space-y-3.5 text-xs py-3 overflow-y-auto flex-1 pr-1">
              {/* Note Title */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  หัวข้อโน๊ต (Title)
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="เช่น เตรียมเอกสาร ปพ.5, การบ้านวิชาคณิตศาสตร์..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs outline-hidden transition-all font-semibold"
                />
              </div>

              {/* Note Content */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  ข้อความ / รายละเอียดโน๊ต
                </label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="พิมพ์ข้อความโน๊ตของคุณที่นี่..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs outline-hidden leading-relaxed transition-all"
                />
              </div>

              {/* Icon Picker (ใส่ไอคอนได้) */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  เลือกไอคอนประจำโน๊ต
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
                  {NOTE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = noteIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNoteIcon(item.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-400/40 shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                        title={item.label}
                      >
                        <IconComp className={`w-4 h-4 ${isSelected ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[9px] font-medium leading-none">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Picker */}
              <div className="pt-1">
                <label className="block font-bold text-gray-700 mb-1.5">
                  โทนสีของโน๊ต
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNoteColor(c.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${c.dot} ${
                        noteColor === c.id
                          ? 'ring-2 ring-offset-2 ring-emerald-600 scale-110 shadow-xs'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={c.label}
                    >
                      {noteColor === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Preview Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">
                  ตัวอย่างการแสดงผล:
                </span>
                <div className={`flex items-start gap-2 p-2 rounded-lg border ${getNoteColorStyles(noteColor).cardBg}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${getNoteColorStyles(noteColor).badge}`}>
                    {renderNoteIcon(noteIcon, 'w-3 h-3')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-900 truncate font-semibold">
                      {noteTitle.trim() || 'ชื่อหัวข้อโน๊ต...'}
                    </p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 whitespace-pre-line font-normal">
                      {noteContent.trim() || 'ข้อความโน๊ต...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {editingNoteId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(editingNoteId)}
                    className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบโน๊ต</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    className="px-3.5 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{editingNoteId ? 'บันทึกการแก้ไข' : 'บันทึกโน๊ต'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
