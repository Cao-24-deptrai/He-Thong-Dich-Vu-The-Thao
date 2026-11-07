import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PoolService } from './pool.service';
import { PoolTicket } from './schemas/pool-ticket.schema';
import { EventsGateway } from '../events/events.gateway';
import { PoolCode, PoolTicketStatus, PoolTicketType, POOL_PRICES } from './enums/pool.enum';

describe('PoolService (Unit Tests - Bước 3.3: Epic E11 Vé bơi theo lượt & Đóng hồ hoàn tiền)', () => {
  let service: PoolService;
  let ticketStore: any[] = [];

  const mockPoolTicketModel: any = jest.fn().mockImplementation((data) => {
    const doc = {
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(function () {
        const existingIdx = ticketStore.findIndex((t) => t.ticketCode === this.ticketCode);
        if (existingIdx >= 0) {
          ticketStore[existingIdx] = this;
        } else {
          ticketStore.push(this);
        }
        return Promise.resolve(this);
      }),
    };
    return doc;
  });

  mockPoolTicketModel.findOne = jest.fn().mockImplementation((filter) => ({
    exec: jest.fn().mockImplementation(() => {
      const found = ticketStore.find((t) => t.ticketCode === filter.ticketCode);
      if (!found) return null;
      return {
        ...found,
        save: jest.fn().mockImplementation(function () {
          const idx = ticketStore.findIndex((t) => t.ticketCode === this.ticketCode);
          if (idx >= 0) ticketStore[idx] = this;
          return Promise.resolve(this);
        }),
      };
    }),
  }));

  mockPoolTicketModel.find = jest.fn().mockImplementation((filter) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockImplementation(() => {
      let result = [...ticketStore];
      if (filter?.status) {
        result = result.filter((t) => t.status === filter.status);
      }
      return result.map((doc) => ({
        ...doc,
        save: jest.fn().mockImplementation(function () {
          const idx = ticketStore.findIndex((t) => t.ticketCode === this.ticketCode);
          if (idx >= 0) ticketStore[idx] = this;
          return Promise.resolve(this);
        }),
      }));
    }),
  }));

  const mockEventsGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  beforeEach(async () => {
    ticketStore = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolService,
        {
          provide: getModelToken(PoolTicket.name),
          useValue: mockPoolTicketModel,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<PoolService>(PoolService);
  });

  describe('1. Bán vé bơi theo lượt trong ngày chuẩn BR-31', () => {
    it('Bán vé: Người lớn 25.000 VND, Trẻ em 20.000 VND; vé có giá trị trong ngày và trạng thái UNUSED', async () => {
      const res = await service.purchaseTickets('user123', {
        adultCount: 2,
        childCount: 1,
        customerPhone: '0988776655',
        customerName: 'Nguyễn Văn Bơi',
      });

      expect(res.success).toBe(true);
      expect(res.totalTickets).toBe(3);

      // Giá chuẩn theo BR-31: 2 x 25.000 + 1 x 20.000 = 70.000 VND
      const expectedTotal = 2 * POOL_PRICES[PoolTicketType.ADULT] + 1 * POOL_PRICES[PoolTicketType.CHILD];
      expect(res.totalPrice).toBe(70000);
      expect(res.totalPrice).toBe(expectedTotal);

      expect(res.tickets.length).toBe(3);
      expect(res.tickets[0].status).toBe(PoolTicketStatus.UNUSED);
      expect(res.tickets[0].price).toBe(25000);
      expect(res.tickets[2].price).toBe(20000);
    });

    it('Quăng lỗi BadRequestException nếu không chọn mua vé nào', async () => {
      await expect(
        service.purchaseTickets('user123', {
          adultCount: 0,
          childCount: 0,
          customerPhone: '0988776655',
          customerName: 'Nguyễn Văn Bơi',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Quét vé vào cổng hồ bơi & Kiểm soát sức chứa (BR-31)', () => {
    it('Khách cầm vé bơi quét cổng hồ 50m -> Gán vào hồ 50m, tăng số người trong hồ 50m và đổi trạng thái USED', async () => {
      const purchaseRes = await service.purchaseTickets('user123', {
        adultCount: 1,
        childCount: 0,
        customerPhone: '0988776655',
        customerName: 'Trần Khách 1',
      });

      const ticket = purchaseRes.tickets[0];

      const scanRes = await service.scanPoolTicket({
        ticketCode: ticket.ticketCode,
        poolCode: PoolCode.POOL_50M,
      });

      expect(scanRes.accessGranted).toBe(true);
      expect(scanRes.turnstileAction).toBe('OPEN');
      expect(scanRes.ticket.status).toBe(PoolTicketStatus.USED);
      expect(scanRes.ticket.scannedPoolCode).toBe(PoolCode.POOL_50M);
      expect(scanRes.pool.currentSwimmers).toBe(1);
    });

    it('Quét lại vé đã sử dụng -> Báo lỗi TICKET_ALREADY_USED (mỗi vé chỉ có giá trị 1 lượt)', async () => {
      const purchaseRes = await service.purchaseTickets('user123', {
        adultCount: 1,
        childCount: 0,
        customerPhone: '0988776655',
        customerName: 'Trần Khách 1',
      });

      const ticket = purchaseRes.tickets[0];

      // Quét lần 1 -> Thành công
      await service.scanPoolTicket({
        ticketCode: ticket.ticketCode,
        poolCode: PoolCode.POOL_50M,
      });

      // Quét lần 2 -> Ném lỗi
      try {
        await service.scanPoolTicket({
          ticketCode: ticket.ticketCode,
          poolCode: PoolCode.POOL_50M,
        });
        fail('Phải ném lỗi TICKET_ALREADY_USED');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        const res = err.getResponse();
        expect(res.errorCode).toBe('TICKET_ALREADY_USED');
      }
    });

    it('Khi hồ bơi đã đạt công suất tối đa (capacity) -> Từ chối 409 Conflict với POOL_CAPACITY_FULL', async () => {
      // Giả lập hồ bơi 25m đã có 40 người (đầy sức chứa 40 người)
      const status = await service.getPoolsStatus();
      const pool25m = (service as any).pools[PoolCode.POOL_25M];
      pool25m.currentSwimmers = 40;

      const purchaseRes = await service.purchaseTickets('user123', {
        adultCount: 1,
        childCount: 0,
        customerPhone: '0988776655',
        customerName: 'Trần Khách 2',
      });

      try {
        await service.scanPoolTicket({
          ticketCode: purchaseRes.tickets[0].ticketCode,
          poolCode: PoolCode.POOL_25M,
        });
        fail('Phải ném POOL_CAPACITY_FULL');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        const res = err.getResponse();
        expect(res.errorCode).toBe('POOL_CAPACITY_FULL');
      }
    });
  });

  describe('3. Khách rời hồ bơi (Check-out giải phóng sức chứa)', () => {
    it('Giảm số người trong hồ bơi khi khách check-out và không để số đếm bị âm', async () => {
      const pool50m = (service as any).pools[PoolCode.POOL_50M];
      pool50m.currentSwimmers = 5;

      const res = await service.checkOutSwimmer({
        poolCode: PoolCode.POOL_50M,
        swimmerCount: 2,
      });

      expect(res.success).toBe(true);
      expect(res.currentSwimmers).toBe(3);

      // Check out vượt quá số người hiện tại -> Không bị âm
      const res2 = await service.checkOutSwimmer({
        poolCode: PoolCode.POOL_50M,
        swimmerCount: 10,
      });
      expect(res2.currentSwimmers).toBe(0);
    });
  });

  describe('4. Đóng hồ bơi đột xuất & Hủy hoàn 100% tiền vé chưa quét trong ngày (AC-87)', () => {
    it('AC-87: Khi đóng hồ đột xuất, tự động hoàn 100% tiền vé cho các vé UNUSED trong ngày', async () => {
      // Khách A mua 1 vé người lớn (25k) và đã quét bơi
      const purchaseA = await service.purchaseTickets('userA', {
        adultCount: 1,
        childCount: 0,
        customerPhone: '0901111111',
        customerName: 'Khách A',
      });
      await service.scanPoolTicket({
        ticketCode: purchaseA.tickets[0].ticketCode,
        poolCode: PoolCode.POOL_50M,
      });

      // Khách B mua 2 vé người lớn + 1 vé trẻ em (Tổng: 70k) nhưng CHƯA QUÉT (UNUSED)
      const purchaseB = await service.purchaseTickets('userB', {
        adultCount: 2,
        childCount: 1,
        customerPhone: '0902222222',
        customerName: 'Khách B',
      });

      // Admin đóng hồ Olympic 50m đột xuất do mưa bão
      const emergencyRes = await service.emergencyClosePool({
        poolCode: PoolCode.POOL_50M,
        reason: 'Mưa bão sấm sét khẩn cấp',
      });

      expect(emergencyRes.success).toBe(true);
      expect(emergencyRes.isClosed).toBe(true);
      expect(emergencyRes.refundedTicketsCount).toBe(3); // Đúng 3 vé chưa quét của Khách B
      expect(emergencyRes.totalRefundAmount).toBe(70000); // Hoàn đúng 100% (70.000 VND)

      // Kiểm tra trạng thái vé Khách B trong database chuyển thành REFUNDED
      const refundedTicket = ticketStore.find((t) => t.ticketCode === purchaseB.tickets[0].ticketCode);
      expect(refundedTicket.status).toBe(PoolTicketStatus.REFUNDED);
      expect(refundedTicket.refundReason).toContain('Mưa bão sấm sét khẩn cấp');
      expect(refundedTicket.refundedAt).toBeDefined();

      // Kiểm tra vé Khách A (đã quét) không bị đổi thành REFUNDED
      const usedTicket = ticketStore.find((t) => t.ticketCode === purchaseA.tickets[0].ticketCode);
      expect(usedTicket.status).toBe(PoolTicketStatus.USED);

      // Khách cố quét vé đã hoàn tiền -> Bị từ chối TICKET_REFUNDED
      await expect(
        service.scanPoolTicket({
          ticketCode: purchaseB.tickets[0].ticketCode,
          poolCode: PoolCode.POOL_50M,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Mở lại hồ bơi sau khi sự cố kết thúc', async () => {
      const reopenRes = await service.reopenPool(PoolCode.POOL_50M);
      expect(reopenRes.success).toBe(true);

      const status = await service.getPoolsStatus();
      const pool50m = status.pools.find((p) => p.code === PoolCode.POOL_50M);
      expect(pool50m?.isClosed).toBe(false);
    });
  });
});
