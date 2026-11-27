'use client';

import React, { useState } from 'react';
import { Cpu, DoorOpen, Printer, QrCode, RefreshCw } from 'lucide-react';
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

const INITIAL_AGENTS: BridgeAgent[] = [
  {
    agentId: 'AGENT-POS-01',
    hostname: 'POS-COUNTER-DESK',
    localIp: '192.168.1.101',
    status: 'ONLINE',
    devices: [
      {
        deviceId: 'PRN-80MM',
        type: 'THERMAL_PRINTER',
        name: 'Máy in hóa đơn nhiệt 80mm',
        status: 'ONLINE',
        port: 'COM3 (9600 baud)',
        lastAction: 'Sẵn sàng nhận lệnh in ESC/POS',
      },
      {
        deviceId: 'CD-RJ11',
        type: 'CASH_DRAWER',
        name: 'Két tiền mặt RJ11',
        status: 'ONLINE',
        port: 'Kết nối qua PRN-80MM',
        lastAction: 'Đang đóng an toàn',
      },
    ],
  },
  {
    agentId: 'AGENT-TURNSTILE-GYM',
    hostname: 'GATE-IO-CONTROLLER',
    localIp: '192.168.1.102',
    status: 'ONLINE',
    devices: [
      {
        deviceId: 'RELAY-TURNSTILE-01',
        type: 'TURNSTILE_BARRIER',
        name: 'Cửa xoay tripod cổng Gym',
        status: 'ONLINE',
        port: 'Modbus RTU RS485 (COM1)',
        lastAction: 'Chờ tín hiệu mở cổng 500ms',
      },
      {
        deviceId: 'QR-BARCODE-01',
        type: 'QR_SCANNER',
        name: 'Đầu đọc mã QR cổng vào',
        status: 'ONLINE',
        port: 'USB HID Scanner',
        lastAction: 'Đang trực quét mã vé',
      },
    ],
  },
  {
    agentId: 'AGENT-KIOSK-01',
    hostname: 'KIOSK-ENTRY-HALL',
    localIp: '192.168.1.103',
    status: 'DEGRADED',
    devices: [
      {
        deviceId: 'PRN-KIOSK',
        type: 'THERMAL_PRINTER',
        name: 'Máy in vé Kiosk sảnh chính',
        status: 'DEGRADED',
        port: 'COM4 (115200 baud)',
        lastAction: 'Cảnh báo sắp hết giấy in (dưới 15%)',
      },
    ],
  },
];

export default function PosBridgePage() {
  const { showToast } = usePosToast();
  const { openReceipt } = useThermalReceipt();

  const [selectedAgentId, setSelectedAgentId] = useState(INITIAL_AGENTS[0].agentId);
  const [events, setEvents] = useState<
    Array<{ id: string; agentId: string; deviceId: string; action: string; time: string }>
  >([
    {
      id: 'ev-1',
      agentId: 'AGENT-POS-01',
      deviceId: 'PRN-80MM',
      action: 'Kiểm tra kết nối đầu in ESC/POS đạt chuẩn',
      time: '08:15:12',
    },
    {
      id: 'ev-2',
      agentId: 'AGENT-TURNSTILE-GYM',
      deviceId: 'RELAY-TURNSTILE-01',
      action: 'Đồng bộ trạng thái rơ-le cửa xoay',
      time: '08:12:40',
    },
  ]);

  const selectedAgent = INITIAL_AGENTS.find((a) => a.agentId === selectedAgentId) || INITIAL_AGENTS[0];

  const triggerCommand = (device: DeviceInfo, commandName: string) => {
    const now = new Date().toLocaleTimeString('vi-VN');
    setEvents((prev) => [
      {
        id: 'ev-' + Date.now(),
        agentId: selectedAgent.agentId,
        deviceId: device.deviceId,
        action: `${commandName} thành công`,
        time: now,
      },
      ...prev.slice(0, 14),
    ]);
    showToast('Thực thi lệnh thiết bị', `${device.name}: ${commandName}`);
    if (device.type === 'THERMAL_PRINTER') {
      openReceipt();
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
          onClick={() => showToast('Đã làm mới trạng thái', 'Toàn bộ Edge Agent đã phản hồi.')}
          className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Quét lại thiết bị</span>
        </button>
      </div>

      {/* 3 Agent Selector Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INITIAL_AGENTS.map((agent) => {
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

      {/* Selected Agent Devices */}
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
