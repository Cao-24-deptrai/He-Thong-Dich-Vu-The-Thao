'use client';

import React, { useState, useEffect } from 'react';
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

interface DeviceEvent {
  _id: string;
  agentId: string;
  deviceId: string;
  eventType: string;
  payload: any;
  timestamp: string;
  syncStatus: 'PROCESSED' | 'PENDING';
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
          deviceId: 'RELAY-TURNSTILE-01',
          type: 'TURNSTILE_BARRIER',
          name: 'Cửa xoay tripod cổng Gym / Bể bơi',
          status: 'ONLINE',
          port: 'Modbus RTU RS485 (COM1)',
          lastAction: 'Mở cửa xoay 5000ms cho User #U-8823'
        },
        {
          deviceId: 'QR-BARCODE-01',
          type: 'QR_SCANNER',
          name: 'Đầu đọc mã QR cố định cổng vào',
          status: 'ONLINE',
          port: 'USB HID Scanner',
          lastAction: 'Quét thành công QR Gym Pass'
        }
      ]
    },
    {
      _id: 'ag-3',
      agentId: 'AGENT-KIOSK-01',
      hostname: 'KIOSK-ENTRY-HALL',
      localIp: '192.168.1.103',
      agentVersion: '1.4.1',
      status: 'DEGRADED',
      lastHeartbeat: new Date(Date.now() - 45000).toISOString(),
      offlineQueueSize: 2,
      devices: [
        {
          deviceId: 'PRN-KIOSK',
          type: 'THERMAL_PRINTER',
          name: 'Máy in vé kiosk tự phục vụ',
          status: 'DEGRADED',
          port: 'COM4 (115200 baud)',
          paperStatus: 'LOW',
          lastAction: 'Cảnh báo cuộn giấy gần hết (<15%)'
        },
        {
          deviceId: 'QR-KIOSK',
          type: 'QR_SCANNER',
          name: 'Camera quét mã căn cước / vé Kiosk',
          status: 'ONLINE',
          port: 'USB Video/HID'
        }
      ]
    }
  ]);

  const [selectedAgent, setSelectedAgent] = useState<BridgeAgent | null>(agents[0]);
  const [events, setEvents] = useState<DeviceEvent[]>([
    {
      _id: 'ev-1',
      agentId: 'AGENT-TURNSTILE-GYM',
      deviceId: 'RELAY-TURNSTILE-01',
      eventType: 'PASSAGE_DETECTED',
      payload: { direction: 'ENTRY', memberId: 'MB-1029', durationMs: 2450 },
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString(),
      syncStatus: 'PROCESSED'
    },
    {
      _id: 'ev-2',
      agentId: 'AGENT-POS-01',
      deviceId: 'PRN-80MM',
      eventType: 'PRINT_JOB_COMPLETED',
      payload: { jobId: 'JOB-9941', linesPrinted: 38, cuts: 1 },
      timestamp: new Date(Date.now() - 45000).toLocaleTimeString(),
      syncStatus: 'PROCESSED'
    },
    {
      _id: 'ev-3',
      agentId: 'AGENT-POS-01',
      deviceId: 'CD-RJ11',
      eventType: 'DRAWER_OPENED_MANUAL',
      payload: { staffId: 'STF-01', reason: 'CHANGE_RETURN' },
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      syncStatus: 'PROCESSED'
    }
  ]);

  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const triggerDeviceCommand = (deviceId: string, commandType: string, params: any = {}) => {
    setIsSendingCommand(true);
    setActionFeedback(`Đang gửi lệnh [${commandType}] tới thiết bị ${deviceId}...`);

    setTimeout(() => {
      setIsSendingCommand(false);
      setActionFeedback(`✓ Thiết bị ${deviceId} đã thực thi lệnh [${commandType}] thành công.`);
      
      const newEvent: DeviceEvent = {
        _id: 'ev-' + Date.now(),
        agentId: selectedAgent?.agentId || 'AGENT-POS-01',
        deviceId,
        eventType: commandType + '_EXECUTED',
        payload: { ...params, executedAt: new Date().toISOString() },
        timestamp: new Date().toLocaleTimeString(),
        syncStatus: 'PROCESSED'
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);

      setTimeout(() => setActionFeedback(null), 4000);
    }, 800);
  };

  return (
    <main className="flex-1 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-cyan-500/20">
            <Cpu className="w-3.5 h-3.5" />
            Module 22 — Bridge Agent & IoT Quầy / Cửa Xoay
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight">
            Quản Lý Phần Cứng Cục Bộ & Edge Agent
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Giao tiếp cục bộ tốc độ cao: Máy in nhiệt ESC/POS, két tiền RJ11, rơ-le cửa xoay tripod Modbus RS485 và đầu đọc QR.
          </p>
        </div>

        <button
          onClick={() => {
            setActionFeedback('Đang làm mới trạng thái các Edge Agent...');
            setTimeout(() => setActionFeedback(null), 1500);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 font-medium text-sm transition"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          Quét Trạng Thái
        </button>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm flex items-center gap-3 animate-fade-in">
          <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Agents Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const isSelected = selectedAgent?.agentId === agent.agentId;
          const isOnline = agent.status === 'ONLINE';
          const isDegraded = agent.status === 'DEGRADED';

          return (
            <div
              key={agent.agentId}
              onClick={() => setSelectedAgent(agent)}
              className={`p-5 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                    isDegraded ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{agent.agentId}</h3>
                    <p className="text-xs text-slate-400 font-mono">{agent.hostname} ({agent.localIp})</p>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  isDegraded ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 animate-pulse' :
                    isDegraded ? 'bg-amber-400' :
                    'bg-rose-400'
                  }`} />
                  {agent.status}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Thiết bị kèm: </span>
                  <span className="text-slate-300 font-semibold">{agent.devices.length} thiết bị</span>
                </div>
                <div>
                  <span className="text-slate-500">Offline Queue: </span>
                  <span className={`font-semibold ${agent.offlineQueueSize > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {agent.offlineQueueSize} bản tin
                  </span>
                </div>
                <div className="col-span-2 text-slate-400 font-mono text-[11px] truncate">
                  v{agent.agentVersion} • Heartbeat: {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Control Panel */}
      {selectedAgent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hardware List & Commands */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                Thiết Bị Kết Nối — {selectedAgent.agentId}
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                IP: {selectedAgent.localIp} | Host: {selectedAgent.hostname}
              </span>
            </div>

            <div className="space-y-3">
              {selectedAgent.devices.map((device) => {
                const getIcon = () => {
                  switch (device.type) {
                    case 'THERMAL_PRINTER': return <Printer className="w-5 h-5 text-cyan-400" />;
                    case 'CASH_DRAWER': return <Layers className="w-5 h-5 text-emerald-400" />;
                    case 'TURNSTILE_BARRIER': return <DoorOpen className="w-5 h-5 text-amber-400" />;
                    case 'QR_SCANNER': return <QrCode className="w-5 h-5 text-violet-400" />;
                    case 'POS_TERMINAL': return <CreditCard className="w-5 h-5 text-blue-400" />;
                  }
                };

                return (
                  <div
                    key={device.deviceId}
                    className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                          {getIcon()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-100">{device.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {device.deviceId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Cổng kết nối: {device.port || 'N/A'}
                          </p>
                          {device.lastAction && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              Lần cuối: <span className="text-slate-300 font-medium">{device.lastAction}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        {device.paperStatus && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            device.paperStatus === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
                            device.paperStatus === 'LOW' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            Giấy: {device.paperStatus}
                          </span>
                        )}

                        {device.type === 'THERMAL_PRINTER' && (
                          <button
                            disabled={isSendingCommand}
                            onClick={() => triggerDeviceCommand(device.deviceId, 'PRINT_TEST_RECEIPT', { template: 'TEST_PAGE' })}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition"
                          >
                            In Thử Nghiệm
                          </button>
                        )}

                        {device.type === 'CASH_DRAWER' && (
                          <button
                            disabled={isSendingCommand}
                            onClick={() => triggerDeviceCommand(device.deviceId, 'OPEN_CASH_DRAWER', { pulseDurationMs: 250 })}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                          >
                            Bật Mở Két Tiền
                          </button>
                        )}

                        {device.type === 'TURNSTILE_BARRIER' && (
                          <button
                            disabled={isSendingCommand}
                            onClick={() => triggerDeviceCommand(device.deviceId, 'TRIGGER_RELAY_OPEN', { pulseMs: 4000, direction: 'IN' })}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
                          >
                            Kích Mở Cửa Xoay (4s)
                          </button>
                        )}

                        {device.type === 'QR_SCANNER' && (
                          <button
                            disabled={isSendingCommand}
                            onClick={() => triggerDeviceCommand(device.deviceId, 'SIMULATE_QR_SCAN', { payload: 'GYM-MEMBER-TEST-001' })}
                            className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-medium transition"
                          >
                            Giả Lập Quét QR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device Events & Audit Log */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Nhật Ký Sự Kiện Realtime
            </h2>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 h-[500px] overflow-y-auto space-y-3 font-mono text-xs">
              {events.map((ev) => (
                <div key={ev._id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-semibold">{ev.eventType}</span>
                    <span className="text-slate-500 text-[11px]">{ev.timestamp}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Device: <span className="text-slate-200">{ev.deviceId}</span> ({ev.agentId})
                  </div>
                  <pre className="p-2 rounded bg-black/40 text-slate-300 text-[10px] overflow-x-auto">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
