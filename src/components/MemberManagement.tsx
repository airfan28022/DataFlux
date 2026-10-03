import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { dataService } from '../services/dataService';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  AlertTriangle,
  Lock,
  User,
  School,
  BookOpen,
  X,
  CheckCircle2
} from 'lucide-react';

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<AppUser[]>(() => dataService.getMembers());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<AppUser | null>(null);

  // Form Fields
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formClassroom, setFormClassroom] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'member'>('member');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Password visibility map for the table
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to dataService updates
  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setMembers(dataService.getMembers());
    });
    return unsub;
  }, []);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${type}-${text}`);
    dataService.notifyToast('success', 'คัดลอกสำเร็จ', `คัดลอก ${text} เรียบร้อยแล้ว`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormUsername('');
    setFormPassword('');
    setFormName('');
    const profile = dataService.getProfile();
    setFormClassroom(profile.classroomName || 'ป.1/1');
    setFormRole('member');
    setFormStatus('active');
    setFormShowPassword(false);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (member: AppUser) => {
    setEditingMember(member);
    setFormUsername(member.username);
    setFormPassword(member.password);
    setFormName(member.name);
    setFormClassroom(member.classroom || '');
    setFormRole(member.role);
    setFormStatus(member.status);
    setFormShowPassword(false);
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Member (Add or Update)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUsername = formUsername.trim().toLowerCase();
    const cleanPassword = formPassword.trim();
    const cleanName = formName.trim();
    const cleanClassroom = formClassroom.trim();

    if (!cleanUsername) {
      setFormError('กรุณาระบุ User ID');
      return;
    }

    if (cleanUsername.length < 3) {
      setFormError('User ID ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setFormError('User ID ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) เท่านั้น');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setFormError('Password ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (!cleanName) {
      setFormError('กรุณาระบุชื่อ-สกุล คุณครูผู้ใช้งาน');
      return;
    }

    // Check duplicate ID if new
    if (!editingMember) {
      const exists = members.some((m) => m.id.toLowerCase() === cleanUsername);
      if (exists) {
        setFormError(`User ID "${cleanUsername}" มีอยู่ในระบบแล้ว กรุณาใช้ ID อื่น`);
        return;
      }
    }

    const memberData: AppUser = {
      id: cleanUsername,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName,
      classroom: cleanClassroom || 'ห้องเรียน',
      schoolName: dataService.getProfile().schoolName || 'โรงเรียนสาธิต',
      role: cleanUsername === 'airfan' ? 'admin' : formRole,
      status: cleanUsername === 'airfan' ? 'active' : formStatus,
      createdAt: editingMember?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: editingMember?.lastLogin,
    };

    await dataService.saveMember(memberData);
    setIsModalOpen(false);
  };

  // Toggle Suspend Status
  const handleToggleStatus = async (member: AppUser) => {
    if (member.id.toLowerCase() === 'airfan') {
      dataService.notifyToast('error', 'ไม่สามารถระงับ Admin ได้', 'ID airfan เป็นผู้ดูแลระบบหลัก');
      return;
    }

    const actionText = member.status === 'active' ? 'ระงับการใช้งาน' : 'เปิดใช้งาน';
    dataService.showAlert({
      type: 'warning',
      title: `ยืนยัน${actionText}?`,
      text:
        member.status === 'active'
          ? `เมื่อระงับการใช้งาน บัญชี ${member.username} จะไม่สามารถเข้าสู่ระบบได้ชั่วคราว`
          : `เมื่อเปิดใช้งาน บัญชี ${member.username} จะสามารถเข้าสู่ระบบและใช้งานได้ตามปกติ`,
      showCancelButton: true,
      confirmButtonText: `ยืนยัน${actionText}`,
      cancelButtonText: 'ยกเลิก',
      onConfirm: async () => {
        await dataService.toggleMemberStatus(member.id);
      },
    });
  };

  // Delete Member
  const handleDeleteMember = async (member: AppUser) => {
    if (member.id.toLowerCase() === 'airfan') {
      dataService.notifyToast('error', 'ไม่สามารถลบ Admin ได้', 'ID airfan เป็นผู้ดูแลระบบหลัก');
      return;
    }

    dataService.showAlert({
      type: 'question',
      title: `ยืนยันการลบบัญชี "${member.username}"?`,
      text: `คุณต้องการลบบัญชีคุณครู ${member.name} (ID: ${member.username}) ใช่หรือไม่? ข้อมูลสมาชิกนี้จะถูกลบออกจากระบบ`,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      onConfirm: async () => {
        await dataService.deleteMember(member.id);
      },
    });
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      m.username.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      (m.classroom && m.classroom.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && m.status === 'active') ||
      (statusFilter === 'suspended' && m.status === 'suspended');

    return matchSearch && matchStatus;
  });

  const totalCount = members.length;
  const activeCount = members.filter((m) => m.status === 'active').length;
  const suspendedCount = members.filter((m) => m.status === 'suspended').length;

  return (
    <div className="space-y-5">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h4 className="text-base font-bold tracking-tight">ระบบจัดการสมาชิกและผู้ใช้งาน</h4>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1 max-w-xl">
              Admin (ID: <strong>airfan</strong>) สามารถเพิ่มสมาชิก กำหนด User ID, รหัสผ่าน, ดูรหัสผ่าน, ระงับใช้งาน หรือลบบัญชีได้ โดยข้อมูลของแต่ละคนจะแยกจากกันอย่างเป็นอิสระและซิงค์ผ่านระบบคลาวด์อัตโนมัติ
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ เพิ่มสมาชิกใหม่</span>
          </button>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-3.5 border-t border-emerald-700/60 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-emerald-200">สมาชิกทั้งหมด</span>
            <span className="font-bold text-sm text-white">{totalCount} คน</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-emerald-200">ใช้งานปกติ</span>
            <span className="font-bold text-sm text-emerald-300">{activeCount} คน</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-emerald-200">ระงับใช้งาน</span>
            <span className="font-bold text-sm text-rose-300">{suspendedCount} คน</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา ID, ชื่อคุณครู, ห้องเรียน..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ใช้งานปกติ ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'suspended'
                ? 'bg-rose-700 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ระงับใช้งาน ({suspendedCount})
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5 sm:px-4">User ID</th>
                <th className="py-3 px-3.5 sm:px-4">รหัสผ่าน (Password)</th>
                <th className="py-3 px-3.5 sm:px-4">ชื่อ-สกุล คุณครู</th>
                <th className="py-3 px-3.5 sm:px-4">ห้องเรียนประจำชั้น</th>
                <th className="py-3 px-3.5 sm:px-4 text-center">สถานะ</th>
                <th className="py-3 px-3.5 sm:px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">ไม่พบข้อมูลสมาชิก</p>
                    <p className="text-[11px]">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;+ เพิ่มสมาชิกใหม่&quot;</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isAdminUser = member.id.toLowerCase() === 'airfan' || member.role === 'admin';
                  const isSuspended = member.status === 'suspended';
                  const isPasswordVisible = !!visiblePasswords[member.id];

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSuspended ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* User ID */}
                      <td className="py-3 px-3.5 sm:px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-950 font-bold">{member.username}</span>
                          {isAdminUser && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              👑 Admin
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(member.username, 'id')}
                            title="คัดลอก ID"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            {copiedId === `id-${member.username}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Password (Can be viewed and copied) */}
                      <td className="py-3 px-3.5 sm:px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span
                            className={`px-2 py-1 rounded-md text-[11px] font-medium border ${
                              isPasswordVisible
                                ? 'bg-amber-50 text-amber-950 border-amber-200 font-bold'
                                : 'bg-slate-100 text-slate-500 border-slate-200 tracking-wider'
                            }`}
                          >
                            {isPasswordVisible ? member.password : '••••••••'}
                          </span>

                          {/* Toggle visibility */}
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(member.id)}
                            title={isPasswordVisible ? 'ซ่อนรหัสผ่าน' : 'ดูรหัสผ่าน'}
                            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Copy password */}
                          <button
                            type="button"
                            onClick={() => handleCopy(member.password, 'pass')}
                            title="คัดลอก Password"
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            {copiedId === `pass-${member.password}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Teacher Name */}
                      <td className="py-3 px-3.5 sm:px-4 font-medium text-slate-800">
                        {member.name || '-'}
                      </td>

                      {/* Classroom */}
                      <td className="py-3 px-3.5 sm:px-4 text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {member.classroom || 'ไม่ระบุ'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 sm:px-4 text-center">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            ระงับใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            ใช้งานปกติ
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3.5 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(member)}
                            title="แก้ไขข้อมูล / เปลี่ยนรหัสผ่าน"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Suspend */}
                          {member.id.toLowerCase() !== 'airfan' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(member)}
                              title={isSuspended ? 'เปิดใช้งานบัญชีนี้' : 'ระงับการใช้งานบัญชีนี้'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSuspended
                                  ? 'text-emerald-700 hover:bg-emerald-100 bg-emerald-50'
                                  : 'text-amber-700 hover:bg-amber-100 bg-amber-50'
                              }`}
                            >
                              {isSuspended ? (
                                <UserCheck className="w-3.5 h-3.5" />
                              ) : (
                                <UserX className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Delete button */}
                          {member.id.toLowerCase() !== 'airfan' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member)}
                              title="ลบบัญชีนี้"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-xl">
                  {editingMember ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingMember ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่เข้าสู่ระบบ'}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    {editingMember
                      ? `แก้ไขบัญชีผู้ใช้ ID: ${editingMember.username}`
                      : 'กำหนด User ID และ Password ให้คุณครู'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveMember} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* User ID */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  User ID (ชื่อผู้ใช้สำหรับเข้าสู่ระบบ) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    disabled={!!editingMember}
                    placeholder="เช่น kru_somchai หรือ teacher2"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ภาษาอังกฤษ ตัวเลข หรือขีดล่าง ไม่เว้นวรรค (ไม่สามารถเปลี่ยน ID ได้หลังบันทึก)
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Password (รหัสผ่าน) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="กำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {formShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Admin สามารถดูและตรวจสอบรหัสผ่านของสมาชิกได้ตลอดเวลา
                </p>
              </div>

              {/* Teacher Full Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อ-สกุล คุณครูผู้ใช้งาน *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น ครูสมศรี สุขเกษม"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50"
                  required
                />
              </div>

              {/* Classroom */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ห้องเรียนประจำชั้น (Classroom)
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    placeholder="เช่น ป.1/1, ป.2, ป.3/2"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Status & Role (only if not airfan) */}
              {formUsername !== 'airfan' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">สถานะการใช้งาน</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'active' | 'suspended')}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50"
                    >
                      <option value="active">ใช้งานปกติ (Active)</option>
                      <option value="suspended">ระงับใช้งาน (Suspended)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">บทบาทสิทธิ์</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as 'admin' | 'member')}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden bg-slate-50/50"
                    >
                      <option value="member">ครูประจำชั้น (Member)</option>
                      <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  {editingMember ? 'บันทึกการแก้ไข' : 'บันทึกสมาชิก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
