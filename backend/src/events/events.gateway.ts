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
import { BookingStatus } from '../common/enums';

export interface SlotStatusChangedPayload {
  venueId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime?: string;
  status: BookingStatus;
  holdExpiresAt?: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_venue')
  handleSubscribeVenue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { venueId: string },
  ) {
    if (data?.venueId) {
      client.join(`venue_${data.venueId}`);
      this.logger.log(`Client ${client.id} joined venue room: venue_${data.venueId}`);
      return { event: 'subscribed', venueId: data.venueId };
    }
  }

  @SubscribeMessage('unsubscribe_venue')
  handleUnsubscribeVenue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { venueId: string },
  ) {
    if (data?.venueId) {
      client.leave(`venue_${data.venueId}`);
      return { event: 'unsubscribed', venueId: data.venueId };
    }
  }

  /**
   * Broadcast thay đổi trạng thái slot tới toàn bộ client đang theo dõi venue
   */
  broadcastSlotStatusChanged(payload: SlotStatusChangedPayload) {
    if (this.server) {
      this.server.to(`venue_${payload.venueId}`).emit('slot_status_changed', payload);
      // Đồng thời broadcast global nếu có client đang ở trang tổng quan
      this.server.emit('slot_status_changed', payload);
    }
    this.logger.log(
      `Broadcast slot_status_changed: Venue ${payload.venueId} | Slot ${payload.startTime} | Status: ${payload.status}`,
    );
  }
}
