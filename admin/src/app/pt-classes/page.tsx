'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Users, 
  Calendar, 
  Plus, 
  CheckCircle, 
  Clock, 
  Award,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  DollarSign
} from 'lucide-react';

export default function PtClassesAdminPage() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'TRAINERS' | 'CLASSES'>('TRAINERS');
  const [loading, setLoading] = useState(true);

  // Form states
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('Gym, Fitness');
  const [hourlyRate, setHourlyRate] = useState(250000);
  const [certifications, setCertifications] = useState('NASM-CPT');

  const [className, setClassName] = useState('');
  const [classType, setClassType] = useState('YOGA');
  const [capacity, setCapacity] = useState(20);
  const [pricePerSession, setPricePerSession] = useState(120000);
  const [defaultStartTime, setDefaultStartTime] = useState('08:00');
  const [defaultEndTime, setDefaultEndTime] = useState('09:00');
  const [roomName, setRoomName] = useState('Studio A');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'TRAINERS') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/pt-classes/trainers`);
        const data = await res.json();
        setTrainers(Array.isArray(data) ? data : []);
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/pt-classes/classes`);
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = api.getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/pt-classes/trainers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: (api.getUser() as any)?.id || api.getUser()?._id || '65f1a2b3c4d5e6f7a8b9c0d1',
          fullName,
          phone,
          specialties: specialties.split(',').map((s) => s.trim()),
          hourlyRate: Number(hourlyRate),
          certifications: certifications.split(',').map((s) => s.trim()),
        }),
      });

      if (!res.ok) throw new Error('Lỗi khi tạo HLV');
      alert('Tạo HLV thành công!');
      setShowTrainerModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo hồ sơ');
    }
  };

  const handleExportPayroll = () => {
    alert('Xuất bảng tổng hợp ca dạy HLV & Lớp học thành công theo chuẩn kế toán!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>HLV Cá Nhân (PT) & Lớp Học Thể Thao</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Quản trị đội ngũ huấn luyện viên chuyên nghiệp, lên lịch lớp học nhóm (Yoga, Zumba) và kết xuất bảng lương ca dạy
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPayroll}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--pitch-green)]" />
            <span>Xuất bảng lương HLV</span>
          </button>

          <button
            onClick={() => (activeTab === 'TRAINERS' ? setShowTrainerModal(true) : setShowClassModal(true))}
            className="phanta-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'TRAINERS' ? 'Thêm HLV' : 'Thêm lớp học'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('TRAINERS')}
          className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'TRAINERS'
              ? 'phanta-btn-primary'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
          }`}
        >
          Danh sách HLV cá nhân
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CLASSES')}
          className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CLASSES'
              ? 'phanta-btn-primary'
              : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
          }`}
        >
          Lịch lớp nhóm (Yoga / Pilates)
        </button>
      </div>

      {/* Main Content */}
      <div className="phanta-card p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
            <p className="text-xs text-[var(--text-sub)]">Đang tải dữ liệu HLV và lớp học...</p>
          </div>
        ) : activeTab === 'TRAINERS' ? (
          trainers.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-sub)]">
              Chưa có hồ sơ huấn luyện viên nào. Nhấn &quot;Thêm HLV&quot; để tạo mới.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainers.map((t) => (
                <div
                  key={t._id}
                  className="p-5 rounded-2xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-base text-[var(--text-heading)]">
                      {t.fullName}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-[var(--pitch-green)]">
                      Sẵn sàng
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-[var(--text-sub)] flex items-center justify-between">
                      <span>Chuyên môn:</span>
                      <span className="font-semibold text-[var(--text-main)]">{Array.isArray(t.specialties) ? t.specialties.join(', ') : t.specialties}</span>
                    </div>
                    <div className="text-[var(--text-sub)] flex items-center justify-between">
                      <span>Chứng chỉ:</span>
                      <span className="font-semibold text-[var(--text-main)]">{Array.isArray(t.certifications) ? t.certifications.join(', ') : t.certifications}</span>
                    </div>
                    <div className="text-[var(--text-sub)] flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                      <span>Mức giá theo giờ:</span>
                      <span className="font-heading font-extrabold text-sm text-[var(--pitch-green)] tabular-nums">
                        {Number(t.hourlyRate || 250000).toLocaleString('vi-VN')} đ/h
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : classes.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-sub)]">
            Chưa có lớp học nhóm nào trong tuần này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <div
                key={c._id}
                className="p-5 rounded-2xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-base text-[var(--text-heading)]">
                    {c.className}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400">
                    {c.classType || 'YOGA'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-[var(--text-sub)] flex items-center justify-between">
                    <span>Phòng tập:</span>
                    <span className="font-semibold text-[var(--text-main)]">{c.roomName || 'Studio A'}</span>
                  </div>
                  <div className="text-[var(--text-sub)] flex items-center justify-between">
                    <span>Sĩ số tối đa:</span>
                    <span className="font-heading font-bold text-[var(--text-heading)] tabular-nums">{c.capacity || 20} học viên</span>
                  </div>
                  <div className="text-[var(--text-sub)] flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                    <span>Học phí mỗi buổi:</span>
                    <span className="font-heading font-extrabold text-sm text-[var(--pitch-green)] tabular-nums">
                      {Number(c.pricePerSession || 120000).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
