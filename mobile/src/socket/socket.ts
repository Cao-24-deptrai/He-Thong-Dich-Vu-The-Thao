// mobile/src/socket/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location ? `http://${window.location.hostname}:3000` : 'http://localhost:3000');

let socket: Socket | null = null;

export interface SlotStatusChangedPayload {
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  holdExpiresAt?: string;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Sports Booking WebSocket gateway:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket gateway');
    });
  }
  return socket;
}

export function subscribeSlotChanges(callback: (data: SlotStatusChangedPayload) => void) {
  const s = getSocket();
  s.on('slot_status_changed', callback);
  return () => {
    s.off('slot_status_changed', callback);
  };
}
