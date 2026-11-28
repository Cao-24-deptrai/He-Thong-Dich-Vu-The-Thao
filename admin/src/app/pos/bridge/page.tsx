'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, DoorOpen, Printer, QrCode, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { usePosToast } from '@/components/pos/PosShell';
import { useThermalReceipt } from '@/components/pos/ThermalReceiptModal';

interface DeviceInfo {
  deviceId: string;
  type: 'THERMAL_PRINTER' | 'CASH_DRAWER' | 'TURNSTILE_BARRIER' | 'QR_SCANNER';
  name: string;
  status: 'ONLINE' | 'DEGRADED';
  port: string;
  lastAction: string;
}

interface BridgeAgent {
  agentId: string;
  hostname: string;
  localIp: string;
  status: 'ONLINE' | 'DEGRADED';
  devices: DeviceInfo[];
}

export default function PosBridgePage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [agents, setAgents] = useState<BridgeAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [events, setEvents] = useState<
    Array<{ id: string; agentId: string; deviceId: string; action: string; time: string }>
  >([]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      let list = await api.getBridgeAgents();
      if (!Array.isArray(list) || list.length === 0) {
        await api.seedBridgeAgents().catch(() => {});
        list = await api.getBridgeAgents();
      }
      const formatted: BridgeAgent[] = (Array.isArray(list) ? list : []).map((a: any) => ({
        agentId: a.agentId || a.agentCode || 'AGENT-UNKNOWN',
        hostname: a.hostname || 'EDGE-NODE',
        localIp: a.localIp || '127.0.0.1',
        status: a.status === 'ONLINE' ? 'ONLINE' : 'DEGRADED',
        devices: (a.devices && a.devices.length > 0)
          ? a.devices
          : [
              {
                deviceId: `DEV-${a.agentCode || a.agentId}-PRN`,
                type: 'THERMAL_PRINTER',
                name: 'Máy in hóa đơn nhiệt 80mm',
                status: 'ONLINE',
                port: 'COM3 (9600 baud)',
                lastAction: 'Sẵn sàng nhận lệnh ESC/POS',
              },
              {
                deviceId: `DEV-${a.agentCode || a.agentId}-CDR`,
                type: 'CASH_DRAWER',
                name: 'Két tiền mặt RJ11',
                status: 'ONLINE',
                port: 'Kết nối qua cổng RJ11 máy in',
                lastAction: 'Đang đóng an toàn',
              },
            ],
      }));
      setAgents(formatted);
      if (formatted.length > 0 && (!selectedAgentId || !formatted.find((x) => x.agentId === selectedAgentId))) {
        setSelectedAgentId(formatted[0].agentId);
      }
    } catch (err: any) {
      showToast('Lỗi tải Edge Bridge', err.message || 'Không thể kết nối danh sách Bridge Agent', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const selectedAgent = agents.find((a) => a.agentId === selectedAgentId) || agents[0];

  const triggerCommand = async (device: DeviceInfo, commandName: string) => {
    const now = new Date().toLocaleTimeString('vi-VN');
    const commandType =
      device.type === 'THERMAL_PRINTER'
        ? 'PRINT_RECEIPT'
        : device.type === 'CASH_DRAWER'
        ? 'OPEN_CASH_DRAWER'
        : device.type === 'TURNSTILE_BARRIER'
        ? 'TRIGGER_TURNSTILE'
        : 'SYNC_MEMBERS';

    try {
      if (selectedAgent) {
        await api.sendBridgeCommand({
          agentId: selectedAgent.agentId,
          deviceId: device.deviceId,
          commandType,
          payload: { commandName, timestamp: Date.now() },
        });
      }

      setEvents((prev) => [
        {
          id: 'ev-' + Date.now(),
          agentId: selectedAgent?.agentId || 'AGENT-POS-01',
          deviceId: device.deviceId,
          action: `${commandName} thành công (Gửi lệnh DB)`,
          time: now,
        },
        ...prev.slice(0, 14),
      ]);

      showToast('Thực thi lệnh thiết bị', `${device.name}: ${commandName}`);
      if (device.type === 'THERMAL_PRINTER') {
        openReceipt();
      }
    } catch (err: any) {
      showToast('Lỗi gửi lệnh', err.message || 'Không gửi được lệnh xuống thiết bị', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-barlow font-extrabold text-xl text-[var(--pos-text-heading)] uppercase">
            Giám sát thiết bị quầy và Edge Bridge
          </h2>
          <p className="text-xs text-[var(--pos-text-sub)] mt-0.5">
            Quản lý máy in nhiệt 80mm, két tiền RJ11, đầu đọc QR và rơ-le cửa xoay tại quầy
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadAgents();
            showToast('Đã làm mới trạng thái', 'Đang cập nhật từ hệ sinh thái Edge Bridge.');
          }}
          className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Quét lại thiết bị</span>
        </button>
      </div>

      {loading && agents.length === 0 ? (
        <div className="phanta-card p-8 flex items-center justify-center text-xs text-[var(--pos-text-sub)]">
          Đang quét các Bridge Agent ngoại vi...
        </div>
      ) : agents.length === 0 ? (
        <div className="phanta-card p-8 text-center space-y-2">
          <p className="text-xs text-[var(--pos-text-sub)]">Chưa ghi nhận Bridge Agent ngoại vi nào kết nối vào hệ thống.</p>
          <button
            type="button"
            onClick={loadAgents}
            className="phanta-btn-primary px-4 py-2 text-xs"
          >
            Khởi tạo Agent mặc định
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const isSelected = agent.agentId === selectedAgentId;
            const isOnline = agent.status === 'ONLINE';
            return (
              <button
                key={agent.agentId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedAgentId(agent.agentId)}
                className={`phanta-card p-4 text-left space-y-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
                  isSelected ? 'border-[var(--pos-accent)]' : 'hover:border-[var(--pos-accent)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-barlow font-bold text-sm text-[var(--pos-text-heading)]">
                    <Cpu className="w-4 h-4 text-[var(--pos-accent)] shrink-0" />
                    <span>{agent.agentId}</span>
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                    style={
                      isOnline
                        ? {
                            backgroundColor: 'var(--pos-accent-soft)',
                            color: 'var(--pos-accent)',
                            borderColor: 'var(--pos-border)',
                          }
                        : {
                            backgroundColor: 'var(--pos-warning-soft)',
                            color: 'var(--pos-warning)',
                            borderColor: 'var(--pos-warning-border)',
                          }
                    }
                  >
                    {isOnline ? 'Trực tuyến' : 'Cảnh báo'}
                  </span>
                </div>

                <div className="text-xs text-[var(--pos-text-sub)] font-tabular">
                  {agent.hostname} - {agent.localIp}
                </div>
                <div className="text-[11px] text-[var(--pos-text-main)] font-tabular">
                  {agent.devices.length} thiết bị ngoại vi kết nối
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Agent Devices */}
      {selectedAgent && (
        <section className="phanta-card p-5 space-y-4">
          <div className="pb-3 border-b border-[var(--pos-border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-barlow font-extrabold text-base text-[var(--pos-text-heading)] uppercase">
                Thiết bị thuộc {selectedAgent.agentId}
              </h3>
              <p className="text-xs text-[var(--pos-text-sub)] font-tabular">
                Máy chủ cục bộ: {selectedAgent.hostname} ({selectedAgent.localIp})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedAgent.devices.map((dev) => {
              const DevIcon =
                dev.type === 'THERMAL_PRINTER'
                  ? Printer
                  : dev.type === 'QR_SCANNER'
                  ? QrCode
                  : DoorOpen;

              return (
                <div key={dev.deviceId} className="phanta-subcard p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-[var(--pos-bg-card)] border border-[var(--pos-border-subtle)] text-[var(--pos-accent)]">
                        <DevIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[var(--pos-text-heading)]">
                          {dev.name}
                        </div>
                        <div className="text-[11px] text-[var(--pos-text-sub)] font-tabular">
                          {dev.deviceId} - {dev.port}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                      style={
                        dev.status === 'ONLINE'
                          ? {
                              backgroundColor: 'var(--pos-accent-soft)',
                              color: 'var(--pos-accent)',
                              borderColor: 'var(--pos-border)',
                            }
                          : {
                              backgroundColor: 'var(--pos-warning-soft)',
                              color: 'var(--pos-warning)',
                              borderColor: 'var(--pos-warning-border)',
                            }
                      }
                    >
                      {dev.status === 'ONLINE' ? 'Sẵn sàng' : 'Sắp hết giấy'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--pos-text-sub)]">{dev.lastAction}</p>

                  <button
                    type="button"
                    onClick={() =>
                      triggerCommand(
                        dev,
                        dev.type === 'THERMAL_PRINTER'
                          ? 'In thử phiếu 80mm'
                          : dev.type === 'CASH_DRAWER'
                          ? 'Mở két tiền'
                          : 'Kiểm tra tín hiệu cổng',
                      )
                    }
                    className="phanta-btn-secondary w-full py-2 text-xs"
                  >
                    {dev.type === 'THERMAL_PRINTER'
                      ? 'In thử phiếu 80mm'
                      : dev.type === 'CASH_DRAWER'
                      ? 'Mở két tiền RJ11'
                      : 'Gửi tín hiệu kiểm tra'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Event Logs */}
      <section className="phanta-card overflow-hidden">
        <div className="p-4 border-b border-[var(--pos-border-subtle)]">
          <h3 className="font-barlow font-bold text-sm text-[var(--pos-text-heading)] uppercase">
            Nhật ký lệnh thiết bị gần đây
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--pos-table-head)] text-[var(--pos-text-sub)] uppercase border-b border-[var(--pos-border-subtle)]">
              <tr>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Thiết bị</th>
                <th className="p-3">Nội dung thực thi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pos-border-subtle)]">
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td className="p-3 font-tabular text-[var(--pos-text-sub)]">{ev.time}</td>
                  <td className="p-3 font-tabular font-semibold text-[var(--pos-text-heading)]">
                    {ev.agentId}
                  </td>
                  <td className="p-3 font-tabular text-[var(--pos-accent)]">{ev.deviceId}</td>
                  <td className="p-3 text-[var(--pos-text-main)]">{ev.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
