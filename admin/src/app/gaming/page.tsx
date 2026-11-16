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
  ArrowRightLeft
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
      alert(`Đã khởi tạo đủ ${data.totalMachines || 100} máy gaming chuẩn (BR-35)!`);
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

  const handleSwitchMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !selectedMachine.currentSessionCode) {
      alert('Máy này không có phiên chơi đang mở để đổi');
      return;
    }
    try {
      const token = api.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/gaming/sessions/switch-machine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionCode: selectedMachine.currentSessionCode,
            targetMachineCode: switchTargetCode.toUpperCase(),
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi đổi máy');
      }
      alert(`Đã đổi phiên chơi sang máy ${switchTargetCode.toUpperCase()} thành công!`);
      setShowSwitchModal(false);
      setSelectedMachine(null);
      loadMachines();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-cyan-400" />
            Sơ Đồ Sàn & Điều Khiển 100 Máy Gaming (M14)
          </h1>
          <p className="text-slate-400 text-sm">
            50 máy sảnh, 30 máy phòng riêng (R01..R03), 20 máy phòng esport (E01) — Điều khiển từ xa & Trừ ví thời gian thực
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadMachines}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
          >
            <RefreshCw className="w-4 h-4" />
            Làm Mới
          </button>

          <button
            onClick={handleSeed100}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-cyan-900/30"
          >
            <Sparkles className="w-4 h-4" />
            Khởi Tạo 100 Máy Chuẩn (BR-35)
          </button>
        </div>
      </div>

      {/* Zone Filter */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {['ALL', 'STANDARD', 'VIP', 'STREAMING'].map((z) => (
          <button
            key={z}
            onClick={() => setSelectedZone(z)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedZone === z
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {z === 'ALL' ? 'Toàn bộ 100 máy' : z === 'STANDARD' ? 'Sảnh (50 máy)' : z === 'VIP' ? 'Phòng Riêng (30 máy)' : 'Phòng Esport (20 máy)'}
          </button>
        ))}
      </div>

      {/* 2D Floor Map Grid */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Sẵn sàng (IDLE)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Đang chơi (IN_USE)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Đang khóa (LOCKED)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-slate-600 inline-block" /> Ngoại tuyến (OFFLINE)
            </span>
          </div>

          <span className="text-xs text-slate-400">Tổng hiển thị: {machines.length} máy</span>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
            {machines.map((m) => {
              const isIdle = m.status === 'IDLE';
              const isInUse = m.status === 'IN_USE';
              const isLocked = m.status === 'LOCKED';
              const isSelected = selectedMachine?._id === m._id;

              return (
                <button
                  key={m._id}
                  onClick={() => setSelectedMachine(m)}
                  className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center justify-center relative ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40'
                      : isIdle
                      ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                      : isInUse
                      ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400'
                      : isLocked
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <Monitor className={`w-5 h-5 mb-1 ${isIdle ? 'text-emerald-400' : isInUse ? 'text-rose-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-white block">{m.machineCode}</span>
                  <span className="text-[10px] text-slate-400 block">{m.hourlyPrice / 1000}k</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Machine Details & Remote Control Panel */}
      {selectedMachine && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                Chi Tiết Máy: {selectedMachine.machineCode} ({selectedMachine.zone})
              </h2>
              <p className="text-slate-400 text-sm">
                Vị trí: {selectedMachine.position?.roomName || 'Sảnh chính'} | Đơn giá: {selectedMachine.hourlyPrice?.toLocaleString('vi-VN')} đ/giờ
              </p>
            </div>

            <span className={`px-3 py-1 rounded-md text-xs font-bold ${
              selectedMachine.status === 'IDLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {selectedMachine.status}
            </span>
          </div>

          {selectedMachine.currentSessionCode && (
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg flex justify-between items-center text-sm">
              <div>
                <p className="text-slate-400 text-xs">Mã phiên đang chơi:</p>
                <p className="text-cyan-400 font-mono font-bold">{selectedMachine.currentSessionCode}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Khách hàng:</p>
                <p className="text-white">{selectedMachine.currentUserPhone || 'Khách vãng lai'}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => handleRemoteAction('LOCK')}
              className="px-3.5 py-2 bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
            >
              <Lock className="w-4 h-4" />
              Khóa Màn Hình
            </button>

            <button
              onClick={() => handleRemoteAction('UNLOCK')}
              className="px-3.5 py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
            >
              <Unlock className="w-4 h-4" />
              Mở Khóa Máy
            </button>

            <button
              onClick={() => setShowSwitchModal(true)}
              className="px-3.5 py-2 bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Đổi Máy Cho Khách
            </button>

            <button
              onClick={() => handleRemoteAction('END_SESSION')}
              className="px-3.5 py-2 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition"
            >
              <Power className="w-4 h-4" />
              Kết Thúc Phiên & Quyết Toán
            </button>
          </div>

          {/* Send Message Form */}
          <div className="pt-2 flex gap-2">
            <input
              type="text"
              value={remoteMessage}
              onChange={(e) => setRemoteMessage(e.target.value)}
              placeholder="Nhập thông điệp gửi xuống màn hình Kiosk..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={() => handleRemoteAction('MESSAGE')}
              disabled={!remoteMessage.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Gửi Tin Nhắn
            </button>
          </div>
        </div>
      )}

      {/* Switch Machine Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-400" />
              Đổi Máy Giữ Nguyên Phiên (F14.6)
            </h2>
            <p className="text-xs text-slate-400">
              Đổi từ máy <strong className="text-white">{selectedMachine?.machineCode}</strong> sang máy mới.
            </p>

            <form onSubmit={handleSwitchMachine} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Mã máy đích (ví dụ: PC-05, PC-R01-02):</label>
                <input
                  required
                  type="text"
                  value={switchTargetCode}
                  onChange={(e) => setSwitchTargetCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm uppercase font-mono font-bold"
                  placeholder="PC-05"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSwitchModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold"
                >
                  Xác Nhận Đổi Máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
