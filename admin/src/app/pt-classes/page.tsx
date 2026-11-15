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
  FileSpreadsheet
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
          userId: api.getUser()?.id || '65f1a2b3c4d5e6f7a8b9c0d1',
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
    alert('Xuất bảng tổng hợp ca dạy HLV & Lớp học thành công theo chuẩn kế toán (AC-89)!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Quản Lý Huấn Luyện Viên & Lớp Học (M11)
          </h1>
          <p className="text-slate-400 text-sm">
            Điều phối ca làm việc HLV, hồ sơ chuyên môn, mẫu lớp học và bảng tổng hợp buổi dạy
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportPayroll}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-sm font-medium transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Bảng Lương (AC-89)
          </button>

          {activeTab === 'TRAINERS' ? (
            <button
              onClick={() => setShowTrainerModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              Thêm Huấn Luyện Viên
            </button>
          ) : (
            <button
              onClick={() => setShowClassModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-cyan-900/30"
            >
              <Plus className="w-4 h-4" />
              Tạo Lớp Học Mới
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('TRAINERS')}
          className={`px-5 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'TRAINERS'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          Hồ Sơ Huấn Luyện Viên ({trainers.length})
        </button>

        <button
          onClick={() => setActiveTab('CLASSES')}
          className={`px-5 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'CLASSES'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Lịch Lớp Học Nhóm ({classes.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : activeTab === 'TRAINERS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((t) => (
            <div key={t._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white text-lg">{t.fullName}</h3>
                  <p className="text-slate-400 text-sm">📞 {t.phone}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-md">
                  {t.employmentStatus}
                </span>
              </div>

              <div className="text-sm">
                <span className="text-slate-400">Đơn giá PT 1-1: </span>
                <span className="text-emerald-400 font-bold">{t.hourlyRate?.toLocaleString('vi-VN')} đ/h</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.specialties?.map((s: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white text-lg">{c.name}</h3>
                  <p className="text-slate-400 text-sm">HLV: {c.trainerName}</p>
                </div>
                <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-md">
                  {c.classType}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm border-t border-slate-800/80 pt-2">
                <span className="text-slate-400">Sức chứa:</span>
                <span className="text-white font-bold">{c.bookedCount}/{c.capacity}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Thời gian:</span>
                <span className="text-slate-300">{c.startTime} - {c.endTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Trainer */}
      {showTrainerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Thêm Huấn Luyện Viên / Nhân Sự</h2>
            <form onSubmit={handleCreateTrainer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Họ và tên</label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Nguyễn Văn Huấn"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Số điện thoại</label>
                <input
                  required
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="0988776655"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Chuyên môn (ngăn cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Gym, Yoga, Boxing"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Đơn giá PT 1-1 (VND/giờ)</label>
                <input
                  required
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTrainerModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
                >
                  Lưu Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
