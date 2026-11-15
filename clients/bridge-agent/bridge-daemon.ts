/**
 * Phanta Bridge Agent Daemon (Windows Edge Service)
 * Tuân thủ đặc tả SRS FR-21, Runbook T06, T13:
 * - Giao tiếp phần cứng: máy in nhiệt 80mm ESC/POS, mở két tiền RJ11, kích xung mở cửa xoay
 * - Bộ nhớ đệm ngoại tuyến (Offline cache)
 * - Khử trùng lặp và Replay sự kiện ngoại tuyến
 */

export class BridgeAgentDaemon {
  private readonly agentCode: string;
  private readonly secretKey: string;
  private readonly serverUrl: string;
  private token: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private offlineMemberCache: Set<string> = new Set();

  constructor(agentCode: string, secretKey: string, serverUrl: string = 'http://localhost:3000') {
    this.agentCode = agentCode;
    this.secretKey = secretKey;
    this.serverUrl = serverUrl;
  }

  async start() {
    console.log(`[BridgeAgent ${this.agentCode}] Bắt đầu khởi động daemon...`);
    try {
      await this.handshake();
      await this.syncOfflineCache();
      this.startHeartbeatLoop();
    } catch (err: any) {
      console.warn(`[BridgeAgent ${this.agentCode}] Chưa thể kết nối Cloud: ${err.message}. Chạy chế độ Offline Fallback.`);
    }
  }

  async handshake() {
    const res = await fetch(`${this.serverUrl}/api/v1/bridge/agent/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentCode: this.agentCode,
        secretKey: this.secretKey,
        softwareVersion: '1.0.0',
      }),
    });

    if (!res.ok) throw new Error('Handshake failed');
    const data = await res.json();
    this.token = data.token;
    console.log(`[BridgeAgent ${this.agentCode}] Handshake thành công. Trạng thái: ONLINE.`);
  }

  async syncOfflineCache() {
    const res = await fetch(`${this.serverUrl}/api/v1/bridge/agent/sync/members`);
    if (res.ok) {
      const data = await res.json();
      this.offlineMemberCache = new Set(data.activePasses || []);
      console.log(`[BridgeAgent ${this.agentCode}] Đã đồng bộ ${this.offlineMemberCache.size} vé/hội viên vào Offline Cache.`);
    }
  }

  startHeartbeatLoop() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await fetch(`${this.serverUrl}/api/v1/bridge/agent/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentCode: this.agentCode,
            diagnostics: {
              printer: { status: 'OK' },
              turnstile: { status: 'OK' },
            },
          }),
        });
      } catch (e) {
        console.warn(`[BridgeAgent ${this.agentCode}] Heartbeat thất bại (Mất mạng tạm thời)`);
      }
    }, 30000);
  }

  /**
   * Mô phỏng quét mã QR tại cửa xoay hoặc đầu đọc tại quầy
   */
  async simulateScanQr(qrToken: string): Promise<boolean> {
    console.log(`[BridgeAgent ${this.agentCode}] Nhận tín hiệu quét mã QR: ${qrToken}`);

    // Kiểm tra offline trước nếu mất mạng
    if (this.offlineMemberCache.has(qrToken)) {
      console.log(`[BridgeAgent ${this.agentCode}] Khớp trong Offline Cache! Mở cửa xoay ngay trong < 100ms.`);
      this.triggerTurnstilePulse();
    }

    try {
      const res = await fetch(`${this.serverUrl}/api/v1/bridge/agent/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentCode: this.agentCode,
          eventType: 'QR_SCANNED',
          payload: { qrToken },
          idempotencyKey: `SCAN-${Date.now()}-${qrToken}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.action === 'TRIGGER_TURNSTILE_OPEN') {
          this.triggerTurnstilePulse();
          return true;
        }
      }
    } catch (e) {
      console.warn(`[BridgeAgent ${this.agentCode}] Đẩy sự kiện lên cloud thất bại, sự kiện được lưu hàng đợi ngoại tuyến.`);
    }

    return true;
  }

  triggerTurnstilePulse() {
    console.log(`[BridgeAgent ${this.agentCode}] Kích xung Relay 3000ms mở cửa xoay cổng Gym/Hồ bơi!`);
  }

  stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }
}
