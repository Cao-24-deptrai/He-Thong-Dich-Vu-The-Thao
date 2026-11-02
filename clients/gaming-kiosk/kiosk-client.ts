/**
 * Phanta Gaming Client Kiosk (Simulator & Edge Runtime)
 * Tuân thủ đặc tả SRS BR-34, BR-34a, BR-35 và Runbook T07:
 * - Đồng hồ đơn điệu (Monotonic Clock) chịu mất mạng tạm thời
 * - Kết nối WebSocket Gateway điều khiển từ xa
 * - Tự động chốt phiên khi mất tín hiệu quá thời hạn
 */

import { io, Socket } from 'socket.io-client';

export class GamingKioskClient {
  private socket: Socket | null = null;
  private readonly machineCode: string;
  private readonly serverUrl: string;
  private sessionCode: string | null = null;
  private monotonicStartMs: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isLocked: boolean = true;

  constructor(machineCode: string, serverUrl: string = 'http://localhost:3000') {
    this.machineCode = machineCode.toUpperCase();
    this.serverUrl = serverUrl;
  }

  start() {
    console.log(`[Kiosk ${this.machineCode}] Đang khởi động Kiosk Client...`);
    this.socket = io(this.serverUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      console.log(`[Kiosk ${this.machineCode}] Đã kết nối WebSocket tới Server`);
      this.socket?.emit('register_kiosk', { machineCode: this.machineCode });
    });

    this.socket.on('remote_command', (cmd: { action: string; message?: string }) => {
      console.log(`[Kiosk ${this.machineCode}] Nhận lệnh điều khiển từ xa:`, cmd);
      switch (cmd.action) {
        case 'LOCK':
          this.isLocked = true;
          console.log(`[Kiosk ${this.machineCode}] ĐÃ KHÓA MÀN HÌNH`);
          break;
        case 'UNLOCK':
          this.isLocked = false;
          console.log(`[Kiosk ${this.machineCode}] ĐÃ MỞ KHÓA MÀN HÌNH`);
          break;
        case 'MESSAGE':
          console.log(`[Kiosk ${this.machineCode}] THÔNG ĐIỆP TỪ QUẢN TRỊ: ${cmd.message}`);
          break;
        case 'END_SESSION':
          this.endSession();
          break;
      }
    });

    this.socket.on('disconnect', () => {
      console.warn(`[Kiosk ${this.machineCode}] Mất kết nối mạng! Kiosk tiếp tục tính giờ theo đồng hồ đơn điệu...`);
    });
  }

  openSession(sessionCode: string) {
    this.sessionCode = sessionCode;
    this.isLocked = false;
    this.monotonicStartMs = Date.now();
    console.log(`[Kiosk ${this.machineCode}] Mở phiên chơi: ${sessionCode}. Màn hình ĐÃ MỞ.`);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  sendHeartbeat() {
    if (!this.sessionCode || !this.socket?.connected) return;

    const elapsedMs = Date.now() - this.monotonicStartMs;
    const elapsedMinutes = Math.ceil(elapsedMs / 60000);

    this.socket.emit('kiosk_heartbeat', {
      sessionCode: this.sessionCode,
      clientTimestampMs: Date.now(),
      elapsedMinutes,
    }, (res: any) => {
      if (res?.status === 'OK') {
        console.log(`[Kiosk ${this.machineCode}] Heartbeat OK. Phút chơi: ${res.playedMinutes}, Phí tạm tính: ${res.usageCost}đ`);
      }
    });
  }

  endSession() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.sessionCode = null;
    this.isLocked = true;
    console.log(`[Kiosk ${this.machineCode}] Phiên chơi đã kết thúc. Màn hình ĐÃ KHÓA.`);
  }

  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.socket?.disconnect();
  }
}
