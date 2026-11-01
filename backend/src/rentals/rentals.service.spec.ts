import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { Equipment } from './schemas/equipment.schema';
import { RentalTicket } from './schemas/rental-ticket.schema';
import {
  SportType,
  RentalPricingType,
  RentalTicketStatus,
  RentalItemCondition,
  PaymentProvider,
} from '../common/enums';
import { Types } from 'mongoose';

describe('RentalsService', () => {
  let service: RentalsService;
  let equipmentModel: any;
  let rentalTicketModel: any;

  const mockEquipmentId = new Types.ObjectId();
  const mockEquipment = {
    _id: mockEquipmentId,
    code: 'EQP-TEN-01',
    name: 'Vợt Tennis Wilson Pro Staff',
    sportType: SportType.TENNIS,
    pricingType: RentalPricingType.PER_TURN,
    price: 50000,
    depositAmount: 200000,
    damageFee: 150000,
    lostFee: 500000,
    totalQuantity: 10,
    rentedQuantity: 0,
    damagedQuantity: 0,
    availableQuantity: 10,
    isActive: true,
  };

  beforeEach(async () => {
    equipmentModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    rentalTicketModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };

    function MockEquipmentModel(dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue({ ...dto, _id: mockEquipmentId }),
      };
    }
    Object.assign(MockEquipmentModel, equipmentModel);

    function MockRentalTicketModel(dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue({ ...dto, _id: new Types.ObjectId() }),
      };
    }
    Object.assign(MockRentalTicketModel, rentalTicketModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        { provide: getModelToken(Equipment.name), useValue: MockEquipmentModel },
        { provide: getModelToken(RentalTicket.name), useValue: MockRentalTicketModel },
      ],
    }).compile();

    service = module.get<RentalsService>(RentalsService);
  });

  describe('createEquipment', () => {
    it('should create equipment with availableQuantity equal to totalQuantity', async () => {
      equipmentModel.findOne.mockResolvedValue(null);

      const result = await service.createEquipment({
        code: 'EQP-TEN-01',
        name: 'Vợt Tennis Wilson Pro Staff',
        sportType: SportType.TENNIS,
        pricingType: RentalPricingType.PER_TURN,
        price: 50000,
        depositAmount: 200000,
        totalQuantity: 10,
      });

      expect(result.code).toBe('EQP-TEN-01');
      expect(result.availableQuantity).toBe(10);
      expect(result.rentedQuantity).toBe(0);
    });

    it('should throw ConflictException if equipment code already exists', async () => {
      equipmentModel.findOne.mockResolvedValue(mockEquipment);

      await expect(
        service.createEquipment({
          code: 'EQP-TEN-01',
          name: 'Vợt Tennis Wilson Pro Staff',
          price: 50000,
          totalQuantity: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createRentalTicket (Atomic Concurrency-safe)', () => {
    it('should atomically deduct available stock and create ticket', async () => {
      equipmentModel.findOneAndUpdate.mockResolvedValue({
        ...mockEquipment,
        availableQuantity: 8,
        rentedQuantity: 2,
      });

      const ticket = await service.createRentalTicket('60d5ecb8b487343568912345', {
        customerPhone: '0911223344',
        customerName: 'Nguyễn Văn A',
        items: [{ equipmentId: mockEquipmentId.toHexString(), quantity: 2 }],
      });

      expect(ticket.ticketCode).toMatch(/^RNT-\d{8}-\d{4}$/);
      expect(ticket.totalRentalAmount).toBe(100000);
      expect(ticket.totalDepositAmount).toBe(400000);
      expect(ticket.status).toBe(RentalTicketStatus.RENTING);
      expect(equipmentModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: mockEquipmentId,
          availableQuantity: { $gte: 2 },
          isActive: true,
        },
        {
          $inc: { availableQuantity: -2, rentedQuantity: 2 },
        },
        { new: true },
      );
    });

    it('should reject and rollback if any equipment stock is insufficient', async () => {
      equipmentModel.findOneAndUpdate.mockResolvedValue(null); // Out of stock

      await expect(
        service.createRentalTicket('60d5ecb8b487343568912345', {
          customerPhone: '0911223344',
          items: [{ equipmentId: mockEquipmentId.toHexString(), quantity: 15 }],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('returnRentalTicket & damage settlement', () => {
    it('should return GOOD items, restore availableQuantity and refund 100% deposit', async () => {
      const mockTicket = {
        _id: new Types.ObjectId(),
        ticketCode: 'RNT-20261101-1001',
        status: RentalTicketStatus.RENTING,
        totalDepositAmount: 400000,
        items: [
          {
            equipmentId: mockEquipmentId,
            quantity: 2,
            returnCondition: undefined,
            penaltyFee: 0,
          },
        ],
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      rentalTicketModel.findById.mockResolvedValue(mockTicket);
      equipmentModel.findById.mockResolvedValue(mockEquipment);
      equipmentModel.findByIdAndUpdate.mockResolvedValue({});

      const returnedTicket = await service.returnRentalTicket(mockTicket._id.toHexString(), {
        items: [
          {
            equipmentId: mockEquipmentId.toHexString(),
            condition: RentalItemCondition.GOOD,
            quantity: 2,
          },
        ],
      });

      expect(returnedTicket.status).toBe(RentalTicketStatus.RETURNED);
      expect(returnedTicket.totalPenaltyFee).toBe(0);
      expect(returnedTicket.refundDepositAmount).toBe(400000);
      expect(equipmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockEquipmentId.toHexString(),
        {
          $inc: { availableQuantity: 2, rentedQuantity: -2 },
        },
      );
    });

    it('should deduct penalty fee from deposit for DAMAGED items', async () => {
      const mockTicket = {
        _id: new Types.ObjectId(),
        ticketCode: 'RNT-20261101-1002',
        status: RentalTicketStatus.RENTING,
        totalDepositAmount: 400000,
        items: [
          {
            equipmentId: mockEquipmentId,
            quantity: 2,
            returnCondition: undefined,
            penaltyFee: 0,
          },
        ],
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      rentalTicketModel.findById.mockResolvedValue(mockTicket);
      equipmentModel.findById.mockResolvedValue(mockEquipment);
      equipmentModel.findByIdAndUpdate.mockResolvedValue({});

      const returnedTicket = await service.returnRentalTicket(mockTicket._id.toHexString(), {
        items: [
          {
            equipmentId: mockEquipmentId.toHexString(),
            condition: RentalItemCondition.DAMAGED,
            quantity: 1,
          },
        ],
      });

      expect(returnedTicket.totalPenaltyFee).toBe(150000);
      expect(returnedTicket.refundDepositAmount).toBe(250000);
      expect(equipmentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockEquipmentId.toHexString(),
        {
          $inc: { damagedQuantity: 1, rentedQuantity: -1 },
        },
      );
    });
  });

  describe('checkUnreturnedRentalsForShift', () => {
    it('should return unreturned tickets count and list for shift audit', async () => {
      const mockShiftId = new Types.ObjectId();
      const mockTickets = [
        { _id: new Types.ObjectId(), ticketCode: 'RNT-1', status: RentalTicketStatus.RENTING },
      ];
      rentalTicketModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTickets),
      });

      const audit = await service.checkUnreturnedRentalsForShift(mockShiftId.toHexString());
      expect(audit.hasUnreturned).toBe(true);
      expect(audit.unreturnedCount).toBe(1);
      expect(audit.tickets.length).toBe(1);
    });
  });
});
