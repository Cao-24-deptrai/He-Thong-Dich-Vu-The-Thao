import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

export interface GamingStation {
  id: string;
  stationNumber: number;
  stationName: string;
  zone: 'TOURNAMENT' | 'VIP' | 'STANDARD';
  zoneName: string;
  areaType: 'LOBBY' | 'ROOM';
  roomId?: 'E01' | 'R01' | 'R02' | 'R03' | null;
  roomName?: string;
  deskCluster?: string;
  gpu: string;
  hourlyRate: number;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
  activeSession?: {
    customerName: string;
    customerPhone?: string;
    startTime: Date;
    depositVnd: number;
    playedMinutes: number;
    currentCost: number;
    remainingDeposit: number;
    isPrebooked?: boolean;
    roomId?: string;
  };
}

export interface GamingRoom {
  id: 'E01' | 'R01' | 'R02' | 'R03';
  name: string;
  type: 'ESPORT_ROOM' | 'PRIVATE_ROOM';
  stationIds: string[];
  hourlyRateRoom: number;
  hourlyRateSingle: number;
  gpu: string;
  status: 'AVAILABLE' | 'BOOKED_WHOLE' | 'PARTIAL_USE';
  activeSession?: {
    customerName: string;
    customerPhone?: string;
    startTime: Date;
    durationHours: number;
    roomCost: number;
  };
}

@Injectable()
export class GamingService {
  private readonly logger = new Logger(GamingService.name);

  private stations: GamingStation[] = [];
  private rooms: GamingRoom[] = [];

  constructor() {
    this.initRooms();
    this.init100Stations();
  }

  private initRooms() {
    this.rooms = [
      {
        id: 'E01',
        name: 'Phòng Esport Pro E01',
        type: 'ESPORT_ROOM',
        stationIds: Array.from({ length: 20 }, (_, i) => 'PC-' + String(81 + i).padStart(2, '0')),
        hourlyRateRoom: 200000,
        hourlyRateSingle: 15000,
        gpu: 'GeForce RTX 4090 24GB',
        status: 'AVAILABLE',
      },
      {
        id: 'R01',
        name: 'Phòng Riêng R01',
        type: 'PRIVATE_ROOM',
        stationIds: Array.from({ length: 10 }, (_, i) => 'PC-' + String(51 + i).padStart(2, '0')),
        hourlyRateRoom: 100000,
        hourlyRateSingle: 15000,
        gpu: 'GeForce RTX 4070Ti 16GB',
        status: 'AVAILABLE',
      },
      {
        id: 'R02',
        name: 'Phòng Riêng R02',
        type: 'PRIVATE_ROOM',
        stationIds: Array.from({ length: 10 }, (_, i) => 'PC-' + String(61 + i).padStart(2, '0')),
        hourlyRateRoom: 100000,
        hourlyRateSingle: 15000,
        gpu: 'GeForce RTX 4070Ti 16GB',
        status: 'AVAILABLE',
      },
      {
        id: 'R03',
        name: 'Phòng Riêng R03',
        type: 'PRIVATE_ROOM',
        stationIds: Array.from({ length: 10 }, (_, i) => 'PC-' + String(71 + i).padStart(2, '0')),
        hourlyRateRoom: 100000,
        hourlyRateSingle: 15000,
        gpu: 'GeForce RTX 4070Ti 16GB',
        status: 'AVAILABLE',
      },
    ];
  }

  private init100Stations() {
    this.stations = [];
    for (let i = 1; i <= 100; i++) {
      const numStr = String(i).padStart(2, '0');
      let zone: 'TOURNAMENT' | 'VIP' | 'STANDARD' = 'STANDARD';
      let zoneName = 'Sảnh Gaming Chung';
      let areaType: 'LOBBY' | 'ROOM' = 'LOBBY';
      let roomId: 'E01' | 'R01' | 'R02' | 'R03' | null = null;
      let roomName: string | undefined = undefined;
      let deskCluster: string | undefined = undefined;
      let gpu = 'GeForce RTX 4060 8GB';
      let hourlyRate = 12000;

      if (i <= 50) {
        zone = 'STANDARD';
        zoneName = 'Sảnh Gaming Chung';
        areaType = 'LOBBY';
        roomId = null;
        gpu = 'GeForce RTX 4060 8GB';
        hourlyRate = 12000;

        if (i <= 10) deskCluster = 'Dãy A (Sảnh)';
        else if (i <= 20) deskCluster = 'Dãy B (Sảnh)';
        else if (i <= 30) deskCluster = 'Dãy C (Sảnh)';
        else if (i <= 40) deskCluster = 'Dãy D (Sảnh)';
        else deskCluster = 'Dãy E (Sảnh)';
      } else if (i <= 60) {
        zone = 'VIP';
        zoneName = 'Phòng Riêng R01';
        areaType = 'ROOM';
        roomId = 'R01';
        roomName = 'Phòng Riêng R01';
        deskCluster = 'Phòng Riêng R01';
        gpu = 'GeForce RTX 4070Ti 16GB';
        hourlyRate = 15000;
      } else if (i <= 70) {
        zone = 'VIP';
        zoneName = 'Phòng Riêng R02';
        areaType = 'ROOM';
        roomId = 'R02';
        roomName = 'Phòng Riêng R02';
        deskCluster = 'Phòng Riêng R02';
        gpu = 'GeForce RTX 4070Ti 16GB';
        hourlyRate = 15000;
      } else if (i <= 80) {
        zone = 'VIP';
        zoneName = 'Phòng Riêng R03';
        areaType = 'ROOM';
        roomId = 'R03';
        roomName = 'Phòng Riêng R03';
        deskCluster = 'Phòng Riêng R03';
        gpu = 'GeForce RTX 4070Ti 16GB';
        hourlyRate = 15000;
      } else {
        zone = 'TOURNAMENT';
        zoneName = 'Phòng Esport Pro E01';
        areaType = 'ROOM';
        roomId = 'E01';
        roomName = 'Phòng Esport Pro E01';
        deskCluster = i <= 90 ? 'E01 - Đội A' : 'E01 - Đội B';
        gpu = 'GeForce RTX 4090 24GB';
        hourlyRate = 15000;
      }

      let status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' = 'AVAILABLE';
      let activeSession: any = undefined;

      if (i === 1 || i === 2 || i === 25 || i === 52) {
        status = 'IN_USE';
        const start = new Date(Date.now() - 45 * 60 * 1000);
        activeSession = {
          customerName: 'Game thủ PC-' + numStr,
          startTime: start,
          depositVnd: 50000,
          playedMinutes: 45,
          currentCost: Math.ceil(45 / 15) * (hourlyRate / 4),
          remainingDeposit: 50000 - Math.ceil(45 / 15) * (hourlyRate / 4),
          roomId: roomId || undefined,
        };
      } else if (i === 13 || i === 75) {
        status = 'MAINTENANCE';
      }

      this.stations.push({
        id: 'PC-' + numStr,
        stationNumber: i,
        stationName: 'Máy Trạm PC-' + numStr,
        zone,
        zoneName,
        areaType,
        roomId,
        roomName,
        deskCluster,
        gpu,
        hourlyRate,
        status,
        activeSession,
      });
    }

    this.recalculateRoomsStatus();
  }

  private recalculateRoomsStatus() {
    this.rooms.forEach((room) => {
      if (room.activeSession) {
        room.status = 'BOOKED_WHOLE';
        return;
      }

      const roomStations = this.stations.filter((s) => s.roomId === room.id);
      const inUseCount = roomStations.filter((s) => s.status === 'IN_USE').length;

      if (inUseCount === 0) {
        room.status = 'AVAILABLE';
      } else if (inUseCount === roomStations.length) {
        room.status = 'BOOKED_WHOLE';
      } else {
        room.status = 'PARTIAL_USE';
      }
    });
  }

  async getStations(zone?: string, roomId?: string): Promise<any> {
    this.recalculateRoomsStatus();

    let list = this.stations;
    if (roomId) {
      list = list.filter((s) => s.roomId === roomId.toUpperCase());
    } else if (zone && zone !== 'ALL') {
      list = list.filter((s) => s.zone === zone.toUpperCase());
    }

    const availableCount = this.stations.filter((s) => s.status === 'AVAILABLE').length;
    const inUseCount = this.stations.filter((s) => s.status === 'IN_USE').length;
    const maintenanceCount = this.stations.filter((s) => s.status === 'MAINTENANCE').length;

    return {
      summary: {
        totalStations: 100,
        available: availableCount,
        inUse: inUseCount,
        maintenance: maintenanceCount,
        occupancyRate: Math.round((inUseCount / 100) * 100) + '%',
        totalLobbyStations: 50,
        totalPrivateRoomsStations: 30,
        totalEsportStations: 20,
      },
      rooms: this.rooms.map((r) => {
        const roomStations = this.stations.filter((s) => s.roomId === r.id);
        const inUse = roomStations.filter((s) => s.status === 'IN_USE').length;
        const available = roomStations.filter((s) => s.status === 'AVAILABLE').length;
        const maintenance = roomStations.filter((s) => s.status === 'MAINTENANCE').length;
        return {
          ...r,
          stationCount: roomStations.length,
          availableCount: available,
          inUseCount: inUse,
          maintenanceCount: maintenance,
        };
      }),
      stations: list,
    };
  }

  async startSession(dto: any): Promise<any> {
    const stationId = dto.stationId || 'PC-01';
    const station = this.stations.find((s) => s.id === stationId);

    if (!station) {
      throw new NotFoundException('Không tìm thấy máy trạm ' + stationId);
    }

    if (station.status === 'IN_USE') {
      throw new BadRequestException('Máy trạm ' + stationId + ' đang có khách chơi');
    }

    if (station.status === 'MAINTENANCE') {
      throw new BadRequestException('Máy trạm ' + stationId + ' đang bảo trì phần cứng');
    }

    const depositVnd = Math.max(10000, Number(dto.depositVnd) || 20000);
    const estimatedMinutes = Math.floor((depositVnd / station.hourlyRate) * 60);

    station.status = 'IN_USE';
    station.activeSession = {
      customerName: dto.customerName || 'Khách chơi net',
      customerPhone: dto.customerPhone || '0900000000',
      startTime: new Date(),
      depositVnd,
      playedMinutes: 0,
      currentCost: 0,
      remainingDeposit: depositVnd,
      isPrebooked: false,
      roomId: station.roomId || undefined,
    };

    this.recalculateRoomsStatus();
    this.logger.log('🎮 Mở máy trạm ' + station.id + ' cho ' + station.activeSession.customerName + ' - Nạp ' + depositVnd + 'đ');

    return {
      stationId: station.id,
      stationName: station.stationName,
      zoneName: station.zoneName,
      areaType: station.areaType,
      roomId: station.roomId,
      roomName: station.roomName,
      hourlyRate: station.hourlyRate,
      customerName: station.activeSession.customerName,
      depositVnd,
      estimatedMinutes,
      startTime: station.activeSession.startTime,
      status: 'IN_USE',
    };
  }

  async endSession(dto: any): Promise<any> {
    const stationId = dto.stationId;
    const station = this.stations.find((s) => s.id === stationId);

    if (!station) {
      throw new NotFoundException('Không tìm thấy máy trạm ' + stationId);
    }

    if (station.status !== 'IN_USE' || !station.activeSession) {
      throw new BadRequestException('Máy trạm ' + stationId + ' hiện không có phiên chơi đang mở');
    }

    const now = new Date();
    const elapsedMs = Math.max(60000, now.getTime() - new Date(station.activeSession.startTime).getTime());
    const exactMinutes = Math.ceil(elapsedMs / 60000);

    const blocksOf15Min = Math.max(1, Math.ceil(exactMinutes / 15));
    const billedMinutes = blocksOf15Min * 15;
    const billedCost = blocksOf15Min * (station.hourlyRate / 4);

    const depositVnd = station.activeSession.depositVnd;
    const depositRefunded = Math.max(0, depositVnd - billedCost);
    const customerName = station.activeSession.customerName;

    station.status = 'AVAILABLE';
    station.activeSession = undefined;

    this.recalculateRoomsStatus();
    this.logger.log('🏁 Đóng máy trạm ' + station.id + ': Chơi ' + billedMinutes + 'p - Tiền cước ' + billedCost + 'đ - Hoàn tiền ' + depositRefunded + 'đ');

    return {
      stationId: station.id,
      customerName,
      exactMinutes,
      billedMinutes,
      hourlyRate: station.hourlyRate,
      depositVnd,
      billedCost,
      depositRefunded,
      status: 'AVAILABLE',
      message: 'Kết thúc phiên chơi và thanh toán cước cuốn chiếu 15p thành công',
    };
  }

  async topup(dto: any): Promise<any> {
    const stationId = dto.stationId;
    const station = this.stations.find((s) => s.id === stationId);

    if (!station || !station.activeSession) {
      throw new NotFoundException('Máy trạm ' + stationId + ' không có phiên chơi đang hoạt động');
    }

    const amount = Math.max(5000, Number(dto.amountVnd) || 10000);
    station.activeSession.depositVnd += amount;
    station.activeSession.remainingDeposit += amount;

    const additionalMinutes = Math.floor((amount / station.hourlyRate) * 60);

    return {
      stationId: station.id,
      addedAmount: amount,
      newTotalDeposit: station.activeSession.depositVnd,
      additionalMinutes,
      message: 'Nạp thêm tiền giờ chơi thành công',
    };
  }

  async startRoomSession(dto: any): Promise<any> {
    const roomId = (dto.roomId || '').toUpperCase();
    const room = this.rooms.find((r) => r.id === roomId);

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng gaming ' + roomId);
    }

    if (room.activeSession || room.status === 'BOOKED_WHOLE') {
      throw new BadRequestException('Phòng ' + room.name + ' hiện đang được thuê trọn phòng');
    }

    const durationHours = Math.max(1, Math.min(12, Number(dto.durationHours) || 2));
    const customerName = dto.customerName || ('Khách Thuê Trọn ' + room.name);
    const totalCost = durationHours * room.hourlyRateRoom;

    const roomStations = this.stations.filter((s) => s.roomId === room.id);
    const maintStations = roomStations.filter((s) => s.status === 'MAINTENANCE').map((s) => s.id);

    const now = new Date();
    room.activeSession = {
      customerName,
      customerPhone: dto.customerPhone || '0900000000',
      startTime: now,
      durationHours,
      roomCost: totalCost,
    };
    room.status = 'BOOKED_WHOLE';

    roomStations.forEach((station) => {
      if (station.status !== 'MAINTENANCE') {
        station.status = 'IN_USE';
        station.activeSession = {
          customerName: customerName + ' (Trọn phòng ' + room.id + ')',
          startTime: now,
          depositVnd: totalCost,
          playedMinutes: 0,
          currentCost: 0,
          remainingDeposit: totalCost,
          isPrebooked: true,
          roomId: room.id,
        };
      }
    });

    this.logger.log('🏢 Mở trọn phòng ' + room.id + ' (' + room.name + ') cho ' + customerName + ' - ' + durationHours + 'h - ' + totalCost + 'đ');

    return {
      roomId: room.id,
      roomName: room.name,
      customerName,
      durationHours,
      hourlyRateRoom: room.hourlyRateRoom,
      totalCost,
      totalStations: roomStations.length,
      activatedStations: roomStations.filter((s) => s.status === 'IN_USE').length,
      maintenanceStations: maintStations,
      startTime: now,
      status: 'BOOKED_WHOLE',
      message: 'Đã mở trọn phòng ' + room.name + ' (' + durationHours + ' giờ) và kích hoạt đồng loạt máy trạm.',
    };
  }

  async endRoomSession(dto: any): Promise<any> {
    const roomId = (dto.roomId || '').toUpperCase();
    const room = this.rooms.find((r) => r.id === roomId);

    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng gaming ' + roomId);
    }

    if (!room.activeSession) {
      throw new BadRequestException('Phòng ' + room.name + ' hiện không có phiên đặt trọn phòng');
    }

    const session = room.activeSession;
    const now = new Date();
    const elapsedMs = Math.max(60000, now.getTime() - new Date(session.startTime).getTime());
    const elapsedMinutes = Math.ceil(elapsedMs / 60000);
    const billedHours = Math.max(1, Math.ceil(elapsedMinutes / 60));
    const finalCost = billedHours * room.hourlyRateRoom;

    const roomStations = this.stations.filter((s) => s.roomId === room.id);
    roomStations.forEach((station) => {
      if (station.status !== 'MAINTENANCE') {
        station.status = 'AVAILABLE';
        station.activeSession = undefined;
      }
    });

    room.activeSession = undefined;
    room.status = 'AVAILABLE';

    this.logger.log('🏁 Kết thúc phiên trọn phòng ' + room.id + ': Billed ' + billedHours + 'h - ' + finalCost + 'đ');

    return {
      roomId: room.id,
      roomName: room.name,
      customerName: session.customerName,
      elapsedMinutes,
      billedHours,
      hourlyRateRoom: room.hourlyRateRoom,
      totalCost: finalCost,
      status: 'AVAILABLE',
      message: 'Đã kết thúc phiên trọn phòng ' + room.name + ' và mở khóa toàn bộ ' + roomStations.length + ' máy.',
    };
  }
}
