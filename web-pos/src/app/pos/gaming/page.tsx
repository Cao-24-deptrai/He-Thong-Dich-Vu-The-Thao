'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Play, RefreshCw, Unlock, X } from 'lucide-react';
import { api, GamingMachine } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

export default function PosGamingPage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [selectedMachine, setSelectedMachine] = useState<GamingMachine | null>(null);
  const [guestName, setGuestName] = useState('Khách quầy lẻ');
  const [hours, setHours] = useState(2);
  const [switchTarget, setSwitchTarget] = useState('');
  const [remoteMsg, setRemoteMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMachines = async () => {
    setLoading(true);
    try {
      const list = await api.getGamingMachines();
      setMachines(Array.isArray(list) ? list : []);
    } catch (err: any) {
      showToast('Lỗi tải sơ đồ máy', err.message || 'Không thể tải danh sách máy gaming', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedMachine(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const zones = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.zone) set.add(m.zone);
    });
    return ['ALL', ...Array.from(set)];
  }, [machines]);

  const filteredMachines = useMemo(() => {
    if (zoneFilter === 'ALL') return machines;
    return machines.filter((m) => m.zone === zoneFilter);
  }, [machines, zoneFilter]);

  const groupedByZone = useMemo(() => {
    const map = new Map<string, GamingMachine[]>();
    filteredMachines.forEach((m) => {
      const key = m.zone || 'SẢNH CHÍNH';
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [filteredMachines]);

  const countPlaying = machines.filter((m) => m.status === 'OCCUPIED' || m.status === 'IN_USE').length;
  const countAvail = machines.filter((m) => m.status === 'AVAILABLE').length;
  const countMaint = machines.filter((m) => m.status === 'MAINTENANCE').length;
  const occupancy = machines.length > 0 ? Math.round((countPlaying / machines.length) * 100) : 0;

  const handleStartSession = async () => {
    if (!selectedMachine) return;
    setSubmitting(true);
    try {
      await api.startGamingSession({
        machineCode: selectedMachine.machineCode,
        customerName: guestName.trim() || 'Khách quầy lẻ',
        prepaidHours: hours,
      });
      const rate = selectedMachine.hourlyRate || 12000;
      const total = rate * hours;

      openReceipt({
        key: 'gaming',
        title: 'PHIẾU MỞ MÁY CYBER GAMING',
        invoiceNo: `#CYB-${selectedMachine.machineCode}`,
        customer: `${guestName.trim() || 'Khách quầy lẻ'} (${selectedMachine.machineCode})`,
        method: 'Tiền mặt tại quầy',
        items: [
          {
            name: `Mở máy ${selectedMachine.machineCode} (${hours} giờ - ${rate.toLocaleString('vi-VN')} đ/h)`,
            qty: 1,
            price: total,
          },
        ],
        subtotal: total,
        total,
        tendered: total,
        change: 0,
      });

      showToast('Mở máy thành công', `Máy ${selectedMachine.machineCode} đã sẵn sàng (${hours} giờ).`);
      setSelectedMachine(null);
      loadMachines();
    } catch (err: any) {
      showToast('Không thể mở máy', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemote = async (command: string) => {
    if (!selectedMachine) return;
    setSubmitting(true);
    try {
      await api.remoteControlGaming({
        machineCode: selectedMachine.machineCode,
        command,
        message: remoteMsg.trim() || undefined,
      });
      showToast('Đã gửi lệnh', `Thực thi lệnh ${command} xuống máy ${selectedMachine.machineCode}`);
      setSelectedMachine(null);
      loadMachines();
    } catch (err: any) {
      showToast('Lỗi điều khiển', err.message || 'Không gửi được lệnh', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndSession = async () => {
    if (!selectedMachine?.activeSession?.sessionCode) {
      showToast('Không có mã phiên', 'Máy này chưa ghi nhận mã phiên đang chạy.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.endGamingSession({
        sessionCode: selectedMachine.activeSession.sessionCode,
        reason: 'Kết thúc phiên tại quầy POS',
      });
      const total = res?.totalCost || res?.billedCost || 0;
      openReceipt({
        key: 'gaming',
        title: 'PHIẾU TRẢ MÁY CYBER GAMING',
        invoiceNo: `#END-${selectedMachine.machineCode}`,
        customer: `${selectedMachine.activeSession?.customerName || 'Khách'} (${selectedMachine.machineCode})`,
        method: 'Quyết toán tại quầy',
        items: [
          {
            name: `Phiên chơi máy ${selectedMachine.machineCode}`,
            qty: 1,
            price: total,
          },
        ],
        subtotal: total,
        total,
      });
      showToast('Đã kết thúc phiên', `Máy ${selectedMachine.machineCode} đã chuyển về trạng thái trống.`);
      setSelectedMachine(null);
      loadMachines();
    } catch (err: any) {
      showToast('Không thể kết thúc phiên', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchMachine = async () => {
    if (!selectedMachine?.activeSession?.sessionCode || !switchTarget.trim()) {
      showToast('Thiếu mã máy đích', 'Nhập mã máy trống cần chuyển sang.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.switchGamingMachine({
        sessionCode: selectedMachine.activeSession.sessionCode,
        targetMachineCode: switchTarget.trim().toUpperCase(),
      });
      showToast('Đổi máy thành công', `Đã chuyển sang máy ${switchTarget.trim().toUpperCase()}`);
      setSwitchTarget('');
      setSelectedMachine(null);
      loadMachines();
    } catch (err: any) {
      showToast('Không thể đổi máy', err.message || 'Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-barlow font-extrabold text-xl text-[var(--pos-text-heading)] uppercase">
            Sơ đồ mặt bằng khu Cyber Gaming (100 PC)
          </h2>
          <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
            Theo dõi trạng thái máy theo từng khu vực - Bấm vào ô máy để nạp giờ hoặc điều khiển từ xa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="phanta-card px-3 py-2 flex flex-wrap items-center gap-3 font-tabular">
            <span className="text-[var(--pos-text-sub)]">
              Đang chơi: <strong className="text-[var(--pos-text-heading)]">{countPlaying}</strong>
            </span>
            <span className="text-[var(--pos-border)]">-</span>
            <span style={{ color: 'var(--pos-accent)' }} className="font-bold">
              Trống: {countAvail}
            </span>
            <span className="text-[var(--pos-border)]">-</span>
            <span style={{ color: 'var(--pos-danger)' }} className="font-bold">
              Bảo trì: {countMaint}
            </span>
            <span className="text-[var(--pos-border)]">-</span>
            <span className="text-[var(--pos-text-sub)]">
              Lấp đầy: <strong className="text-[var(--pos-text-heading)]">{occupancy}%</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={loadMachines}
            className="phanta-btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Zone Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {zones.map((z) => {
          const active = zoneFilter === z;
          return (
            <button
              key={z}
              type="button"
              aria-pressed={active}
              onClick={() => setZoneFilter(z)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
                active
                  ? 'bg-[var(--pos-accent)] text-[var(--pos-accent-fg)] border-[var(--pos-accent)] font-bold'
                  : 'bg-[var(--pos-bg-card)] text-[var(--pos-text-sub)] border-[var(--pos-border-subtle)] hover:text-[var(--pos-text-heading)]'
              }`}
            >
              {z === 'ALL' ? `Toàn bộ (${machines.length} máy)` : z}
            </button>
          );
        })}
      </div>

      {/* Floorplan Zones */}
      {loading ? (
        <div className="phanta-card p-8 text-center text-xs text-[var(--pos-text-sub)]">
          Đang tải sơ đồ máy trạm...
        </div>
      ) : groupedByZone.length === 0 ? (
        <div className="phanta-card p-8 text-center text-xs text-[var(--pos-text-sub)]">
          Chưa có dữ liệu máy trạm trong hệ thống.
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByZone.map(([zoneName, list]) => (
            <section key={zoneName} className="phanta-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--pos-border-subtle)]">
                <div>
                  <h3 className="font-barlow font-extrabold text-sm text-[var(--pos-text-heading)] uppercase">
                    Khu vực: {zoneName}
                  </h3>
                  <p className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                    {list.length} máy trạm - Đơn giá {(list[0]?.hourlyRate || 12000).toLocaleString('vi-VN')} đ/giờ
                  </p>
                </div>
                <span className="text-xs font-semibold font-tabular text-[var(--pos-accent)]">
                  Còn trống: {list.filter((m) => m.status === 'AVAILABLE').length}/{list.length}
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
                {list.map((m) => {
                  const isAvail = m.status === 'AVAILABLE';
                  const isMaint = m.status === 'MAINTENANCE';
                  const style = isAvail
                    ? {
                        backgroundColor: 'var(--pos-accent-soft)',
                        borderColor: 'var(--pos-border)',
                        color: 'var(--pos-accent)',
                      }
                    : isMaint
                    ? {
                        backgroundColor: 'var(--pos-danger-soft)',
                        borderColor: 'var(--pos-danger-border)',
                        color: 'var(--pos-danger)',
                      }
                    : {
                        backgroundColor: 'var(--pos-bg-card-inner)',
                        borderColor: 'var(--pos-border-subtle)',
                        color: 'var(--pos-text-main)',
                      };

                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => {
                        setSelectedMachine(m);
                        setRemoteMsg('');
                        setSwitchTarget('');
                      }}
                      style={style}
                      title={`${m.machineCode} - ${m.status}`}
                      className="h-11 rounded-xl border font-barlow font-bold text-xs flex items-center justify-center transition-colors hover:border-[var(--pos-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
                    >
                      <span className="font-tabular">{m.machineCode}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Machine Control Modal */}
      {selectedMachine && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gaming-modal-heading"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMachine(null);
          }}
        >
          <div className="w-full max-w-md phanta-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--pos-border-subtle)]">
              <div>
                <h3 id="gaming-modal-heading" className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                  Máy trạm {selectedMachine.machineCode}
                </h3>
                <p className="text-xs text-[var(--pos-text-sub)]">
                  Khu {selectedMachine.zone} - Trạng thái: {selectedMachine.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMachine(null)}
                aria-label="Đóng cửa sổ máy trạm"
                className="p-1.5 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedMachine.status === 'AVAILABLE' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label htmlFor="gaming-guest" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                    Tên khách hàng
                  </label>
                  <input
                    id="gaming-guest"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="phanta-input w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="gaming-hours" className="block font-semibold text-[var(--pos-text-main)] mb-1">
                    Số giờ mở máy
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHours(h)}
                        className={`py-2 rounded-xl border font-tabular font-bold ${
                          hours === h
                            ? 'bg-[var(--pos-accent)] text-[var(--pos-accent-fg)] border-[var(--pos-accent)]'
                            : 'bg-[var(--pos-bg-card-inner)] text-[var(--pos-text-heading)] border-[var(--pos-border-subtle)]'
                        }`}
                      >
                        {h} giờ
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleStartSession}
                  className="phanta-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Mở máy và in phiếu 80mm</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {selectedMachine.activeSession?.sessionCode && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleEndSession}
                    className="phanta-btn-primary w-full py-2.5 text-xs"
                  >
                    Kết thúc phiên và in phiếu 80mm
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRemote('LOCK')}
                    className="phanta-btn-secondary py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa máy</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRemote('UNLOCK')}
                    className="phanta-btn-secondary py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở khóa</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="gaming-switch-target" className="block font-semibold text-[var(--pos-text-main)]">
                    Đổi sang máy khác (nhập mã máy trống)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="gaming-switch-target"
                      type="text"
                      value={switchTarget}
                      onChange={(e) => setSwitchTarget(e.target.value)}
                      placeholder="VD: PC-12"
                      className="phanta-input flex-1 px-3 py-2 text-xs font-tabular"
                    />
                    <button
                      type="button"
                      disabled={submitting || !switchTarget.trim()}
                      onClick={handleSwitchMachine}
                      className="phanta-btn-primary px-3 py-2 text-xs"
                    >
                      Chuyển
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="gaming-remote-msg" className="block font-semibold text-[var(--pos-text-main)]">
                    Gửi thông báo xuống màn hình máy
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="gaming-remote-msg"
                      type="text"
                      value={remoteMsg}
                      onChange={(e) => setRemoteMsg(e.target.value)}
                      placeholder="Nội dung tin nhắn..."
                      className="phanta-input flex-1 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      disabled={submitting || !remoteMsg.trim()}
                      onClick={() => handleRemote('MESSAGE')}
                      className="phanta-btn-secondary px-3 py-2 text-xs"
                    >
                      Gửi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
