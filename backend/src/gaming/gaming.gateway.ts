import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GamingSessionService } from './gaming-session.service';
import { GamingMachineService } from './gaming-machine.service';
import { RemoteControlDto } from './dto/gaming.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class GamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GamingGateway.name);
  private readonly connectedClients: Map<string, { socketId: string; machineCode?: string }> = new Map();

  constructor(
    private readonly sessionService: GamingSessionService,
    private readonly machineService: GamingMachineService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Kiosk Client connected: ${client.id}`);
    this.connectedClients.set(client.id, { socketId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Kiosk Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('register_kiosk')
  handleRegisterKiosk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { machineCode: string },
  ) {
    const info = this.connectedClients.get(client.id);
    if (info) {
      info.machineCode = payload.machineCode.toUpperCase();
      client.join(`machine_${info.machineCode}`);
      this.logger.log(`Kiosk ${info.machineCode} registered on socket ${client.id}`);
    }
    return { status: 'REGISTERED', machineCode: payload.machineCode };
  }

  @SubscribeMessage('kiosk_heartbeat')
  async handleKioskHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionCode: string; clientTimestampMs: number },
  ) {
    try {
      const session = await this.sessionService.processHeartbeat({
        sessionCode: payload.sessionCode,
        clientTimestampMs: payload.clientTimestampMs,
      });

      // Broadcast cập nhật tới Admin Floor Map
      this.server.emit('session_updated', session);

      return {
        status: 'OK',
        playedMinutes: session.totalPlayedMinutes,
        usageCost: session.actualUsageAmount,
        holdAmount: session.totalHoldAmount,
      };
    } catch (err: any) {
      return { status: 'ERROR', message: err.message };
    }
  }

  @SubscribeMessage('send_remote_command')
  async handleRemoteCommand(@MessageBody() dto: RemoteControlDto) {
    this.logger.log(`Sending remote command ${dto.action} to ${dto.machineCode}`);

    // Gửi lệnh thẳng tới Kiosk của máy cụ thể
    this.server.to(`machine_${dto.machineCode.toUpperCase()}`).emit('remote_command', {
      action: dto.action,
      message: dto.message,
    });

    return { status: 'SENT', machineCode: dto.machineCode, action: dto.action };
  }
}
