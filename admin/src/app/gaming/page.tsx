'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Gamepad2, 
  Monitor, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Power, 
  MessageSquare, 
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';

export default function GamingAdminPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [remoteMessage, setRemoteMessage] = useState('');
  const [switchTargetCode, setSwitchTargetCode] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    loadMachines();
  }, [selectedZone]);

  const loadMachines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/gaming/machines`);
      const data = await res.json();
      let list = Array.isArray(data) ? data : [];
      if (selectedZone !== 'ALL') {
        list = list.filter((m) => m.zone === selectedZone);
      }
      setMachines(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed100 = async () => {
    try {
      const token = api.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/gaming/machines/seed-100`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      alert(`Đã khởi tạo đủ ${data.totalMachines || 100} máy gaming chuẩn!`);
      loadMachines();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemoteAction = async (action: string) => {
    if (!selectedMachine) return;
    try {
      const token = api.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/gaming/remote-control`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            machineCode: selectedMachine.machineCode,
            action,
            message: action === 'MESSAGE' ? remoteMessage : undefined,
          }),
        },
      );
      if (!res.ok) throw new Error('Lỗi gửi lệnh điều khiển');
      alert(`Đã gửi lệnh ${action} xuống máy ${selectedMachine.machineCode}!`);
      if (action === 'MESSAGE') setRemoteMessage('');
      loadMachines();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Gamepad2 className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>Khu Vực Gaming 100 Máy (Esports Center)</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Điều khiển từ xa trạm máy, khóa/mở màn hình, quản lý phiên chơi và chuyển đổi máy trạm tự động
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed100}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--pitch-green)]" />
            <span>Khởi tạo 100 máy</span>
          </button>

          <button
            onClick={loadMachines}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Zone Filters */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs">
        <span className="text-xs font-bold text-[var(--text-sub)] px-2">Phân khu:</span>
        {[
          { id: 'ALL', label: 'Tất cả 100 máy' },
          { id: 'ZONE_STANDARD', label: 'Khu Tiêu Chuẩn (Máy 01 - 50)' },
          { id: 'ZONE_VIP', label: 'Khu VIP Đơn (Máy 51 - 80)' },
          { id: 'ZONE_COUPLE', label: 'Khu Đôi Couple (Máy 81 - 90)' },
          { id: 'ZONE_TOURNAMENT', label: 'Phòng Đấu Thi Đấu (Máy 91 - 100)' },
        ].map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => setSelectedZone(z.id)}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
              selectedZone === z.id
                ? 'phanta-btn-primary'
                : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
            }`}
          >
            {z.label}
          </button>
        ))}
      </div>

      {/* 100 Machines Matrix Grid */}
      <div className="phanta-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
            <span>Sơ đồ trạm máy gaming trực tiếp</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-heading font-extrabold bg-[var(--pitch-green)]/15 text-[var(--pitch-green)] border border-[var(--pitch-green)]/30 tabular-nums">
              {machines.length} máy
            </span>
          </h2>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
              <span className="text-[var(--text-sub)]">Sẵn sàng</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[var(--burnt-orange)]" />
              <span className="text-[var(--burnt-orange-light)] font-bold">Đang chơi</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40" />
              <span className="text-[var(--text-sub)]">Khóa/Tắt</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
            <p className="text-xs text-[var(--text-sub)]">Đang tải trạng thái trạm máy...</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {machines.map((m) => {
              const isOccupied = m.status === 'OCCUPIED' || m.currentSessionCode;
              const isSelected = selectedMachine?.machineCode === m.machineCode;
              let bg = 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)] hover:border-[var(--pitch-green)]';
              if (isOccupied) bg = 'bg-[var(--burnt-orange)]/15 border-[var(--burnt-orange)]/50 text-[var(--burnt-orange-light)] font-bold';
              if (isSelected) bg += ' ring-2 ring-[var(--pitch-green)] shadow-lg';

              return (
                <button
                  key={m.machineCode}
                  type="button"
                  onClick={() => setSelectedMachine(m)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${bg}`}
                >
                  <Monitor className={`w-4 h-4 ${isOccupied ? 'text-[var(--burnt-orange-light)]' : 'text-[var(--pitch-green)]'}`} />
                  <span className="text-xs font-heading font-extrabold tabular-nums text-[var(--text-heading)]">
                    {m.machineCode}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-sub)]">
                    {isOccupied ? 'Đang chơi' : 'Trống'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Remote Control Panel */}
      {selectedMachine && (
        <div className="phanta-card p-6 border border-[var(--pitch-green)]/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--pitch-green)]" />
                <span>Bảng điều khiển từ xa: Máy {selectedMachine.machineCode}</span>
              </h3>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Cấu hình: {selectedMachine.specs || 'Core i7, RTX 4070 Ti, RAM 32GB, Màn hình 280Hz'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold font-heading bg-[var(--pitch-green)]/15 text-[var(--pitch-green)] border border-[var(--pitch-green)]/30">
              Trạng thái: {selectedMachine.status || 'ONLINE'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleRemoteAction('UNLOCK')}
              className="phanta-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở khóa màn hình</span>
            </button>
            <button
              onClick={() => handleRemoteAction('LOCK')}
              className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Khóa máy</span>
            </button>
            <button
              onClick={() => handleRemoteAction('RESTART')}
              className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 text-amber-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khởi động lại</span>
            </button>
            <button
              onClick={() => handleRemoteAction('SHUTDOWN')}
              className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 text-rose-400"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Tắt máy</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
