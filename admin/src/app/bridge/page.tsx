'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Printer,
  DoorOpen,
  QrCode,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Send,
  Layers,
  HardDrive,
  Clock,
  Terminal,
  Zap
} from 'lucide-react';

interface DeviceInfo {
  deviceId: string;
  type: 'THERMAL_PRINTER' | 'CASH_DRAWER' | 'TURNSTILE_BARRIER' | 'QR_SCANNER' | 'POS_TERMINAL';
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  port?: string;
  paperStatus?: 'OK' | 'LOW' | 'EMPTY';
  lastAction?: string;
}

interface BridgeAgent {
  _id: string;
  agentId: string;
  hostname: string;
  localIp: string;
  agentVersion: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  lastHeartbeat: string;
  offlineQueueSize: number;
  devices: DeviceInfo[];
}

export default function BridgeAgentsPage() {
  const [agents, setAgents] = useState<BridgeAgent[]>([
    {
      _id: 'ag-1',
      agentId: 'AGENT-POS-01',
      hostname: 'POS-COUNTER-DESK',
      localIp: '192.168.1.101',
      agentVersion: '1.4.2',
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      offlineQueueSize: 0,
      devices: [
        {
          deviceId: 'PRN-80MM',
          type: 'THERMAL_PRINTER',
          name: 'Máy in hóa đơn nhiệt 80mm',
          status: 'ONLINE',
          port: 'COM3 (9600 baud)',
          paperStatus: 'OK',
          lastAction: 'In hóa đơn #INV-9281'
        },
        {
          deviceId: 'CD-RJ11',
          type: 'CASH_DRAWER',
          name: 'Két tiền tự động RJ11',
          status: 'ONLINE',
          port: 'Connected via PRN-80MM',
          lastAction: 'Mở két tiền tự động'
        },
        {
          deviceId: 'POS-VERIFONE',
          type: 'POS_TERMINAL',
          name: 'Máy POS Quẹt Thẻ Ngân Hàng',
          status: 'ONLINE',
          port: 'TCP/IP 192.168.1.105:8080',
          lastAction: 'Giao dịch thẻ chip thành công'
        }
      ]
    },
    {
      _id: 'ag-2',
      agentId: 'AGENT-TURNSTILE-GYM',
      hostname: 'GATE-IO-CONTROLLER',
      localIp: '192.168.1.102',
      agentVersion: '1.4.2',
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      offlineQueueSize: 0,
      devices: [
        {
          deviceId: 'TURN-ENTRY-01',
          type: 'TURNSTILE_BARRIER',
          name: 'Cổng xoay ba chấu Lối Vào (Tripod Turnstile)',
          status: 'ONLINE',
          port: 'Modbus TCP 192.168.1.201',
          lastAction: 'Mở cổng check-in thành công'
        },
        {
          deviceId: 'SCAN-QR-01',
          type: 'QR_SCANNER',
          name: 'Đầu đọc mã QR cố định cổng xoay',
          status: 'ONLINE',
          port: 'USB HID (COM5)',
          lastAction: 'Quét vé QR #TKT-8841'
        }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);

  const handleTestCommand = (agentId: string, deviceId: string, command: string) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    setTestLog((prev) => [
      `[${timestamp}] Gửi lệnh "${command}" xuống ${agentId} -> Thiết bị ${deviceId} thành công (HTTP 200 OK)`,
      ...prev.slice(0, 8),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>Phanta Bridge Agent & Thiết Bị IoT</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Cầu nối điều khiển phần cứng ngoại vi: Máy in nhiệt 80mm, két tiền RJ11, cổng xoay ba chấu phòng gym và máy POS quẹt thẻ
          </p>
        </div>

        <button
          onClick={() => setLoading(false)}
          className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Kiểm tra kết nối Agent</span>
        </button>
      </div>

      {/* Agents List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((ag) => (
          <div key={ag.agentId} className="phanta-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-base text-[var(--text-heading)]">
                    {ag.agentId}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-[var(--pitch-green)]">
                    {ag.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  Host: {ag.hostname} - IP: {ag.localIp} (v{ag.agentVersion})
                </p>
              </div>

              <div className="text-right text-[11px] text-[var(--text-sub)]">
                <span>Heartbeat: </span>
                <span className="font-heading font-bold text-[var(--pitch-green)] tabular-nums">Vừa xong</span>
              </div>
            </div>

            {/* Devices List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-[var(--text-sub)] uppercase tracking-wider">
                Thiết bị ngoại vi kết nối ({ag.devices.length}):
              </h4>
              {ag.devices.map((dev) => (
                <div
                  key={dev.deviceId}
                  className="p-3.5 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--pitch-green)]">
                      {dev.type === 'THERMAL_PRINTER' && <Printer className="w-4 h-4" />}
                      {dev.type === 'CASH_DRAWER' && <HardDrive className="w-4 h-4" />}
                      {dev.type === 'TURNSTILE_BARRIER' && <DoorOpen className="w-4 h-4" />}
                      {dev.type === 'QR_SCANNER' && <QrCode className="w-4 h-4" />}
                      {dev.type === 'POS_TERMINAL' && <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-[var(--text-heading)]">
                        {dev.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-sub)]">
                        {dev.port} - {dev.lastAction}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestCommand(ag.agentId, dev.deviceId, 'PING_TEST')}
                      className="phanta-btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-[var(--pitch-green)]" />
                      <span>Test lệnh</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Command Output */}
      {testLog.length > 0 && (
        <div className="phanta-card p-6 bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--pitch-green)]">
            <Terminal className="w-4 h-4" />
            <span>Nhật ký giao thức phần cứng (Hardware Protocol Log):</span>
          </div>
          <div className="space-y-1 text-[11px] font-heading tabular-nums text-slate-300">
            {testLog.map((log, i) => (
              <div key={i} className="text-emerald-400/90">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
