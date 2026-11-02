import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Equipment, EquipmentDocument } from './schemas/equipment.schema';
import { RentalTicket, RentalTicketDocument, RentalTicketItem } from './schemas/rental-ticket.schema';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateRentalTicketDto } from './dto/create-rental-ticket.dto';
import { ReturnRentalTicketDto } from './dto/return-rental-ticket.dto';
import {
  RentalTicketStatus,
  RentalItemCondition,
  RentalPricingType,
  PaymentProvider,
  SportType,
} from '../common/enums';

@Injectable()
export class RentalsService {
  constructor(
    @InjectModel(Equipment.name)
    private readonly equipmentModel: Model<EquipmentDocument>,
    @InjectModel(RentalTicket.name)
    private readonly rentalTicketModel: Model<RentalTicketDocument>,
  ) {}

  // -------------------------------------------------------------
  // EQUIPMENT MANAGEMENT (CRUD)
  // -------------------------------------------------------------

  async createEquipment(dto: CreateEquipmentDto): Promise<Equipment> {
    const existing = await this.equipmentModel.findOne({ code: dto.code.toUpperCase().trim() });
    if (existing) {
      throw new ConflictException(`Mã thiết bị '${dto.code}' đã tồn tại trong hệ thống.`);
    }

    const availableQuantity = dto.totalQuantity;
    const equipment = new this.equipmentModel({
      ...dto,
      code: dto.code.toUpperCase().trim(),
      depositAmount: dto.depositAmount || 0,
      damageFee: dto.damageFee || 0,
      lostFee: dto.lostFee || 0,
      rentedQuantity: 0,
      damagedQuantity: 0,
      availableQuantity,
      isActive: true,
    });

    return equipment.save();
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto): Promise<Equipment> {
    const equipment = await this.equipmentModel.findById(id);
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị với ID ${id}`);
    }

    if (dto.code && dto.code.toUpperCase() !== equipment.code) {
      const codeTaken = await this.equipmentModel.findOne({
        code: dto.code.toUpperCase().trim(),
        _id: { $ne: id },
      });
      if (codeTaken) {
        throw new ConflictException(`Mã thiết bị '${dto.code}' đã được sử dụng.`);
      }
      equipment.code = dto.code.toUpperCase().trim();
    }

    if (dto.name !== undefined) equipment.name = dto.name;
    if (dto.sportType !== undefined) equipment.sportType = dto.sportType;
    if (dto.pricingType !== undefined) equipment.pricingType = dto.pricingType;
    if (dto.price !== undefined) equipment.price = dto.price;
    if (dto.depositAmount !== undefined) equipment.depositAmount = dto.depositAmount;
    if (dto.damageFee !== undefined) equipment.damageFee = dto.damageFee;
    if (dto.lostFee !== undefined) equipment.lostFee = dto.lostFee;
    if (dto.imageUrl !== undefined) equipment.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) equipment.isActive = dto.isActive;

    if (dto.totalQuantity !== undefined && dto.totalQuantity !== equipment.totalQuantity) {
      const diff = dto.totalQuantity - equipment.totalQuantity;
      if (equipment.availableQuantity + diff < 0) {
        throw new BadRequestException('Tổng số lượng mới không thể nhỏ hơn số lượng đang cho thuê và hỏng/mất.');
      }
      equipment.totalQuantity = dto.totalQuantity;
      equipment.availableQuantity += diff;
    }

    return equipment.save();
  }

  async findAllEquipments(query: {
    sportType?: SportType;
    search?: string;
    availableOnly?: boolean;
    isActive?: boolean;
  }): Promise<Equipment[]> {
    const filter: Record<string, any> = {};

    if (query.sportType) {
      filter.sportType = query.sportType;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    } else {
      filter.isActive = true;
    }
    if (query.availableOnly) {
      filter.availableQuantity = { $gt: 0 };
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { code: { $regex: query.search, $options: 'i' } },
      ];
    }

    return this.equipmentModel.find(filter).sort({ code: 1 }).exec();
  }

  async findEquipmentById(id: string): Promise<Equipment> {
    const equipment = await this.equipmentModel.findById(id).exec();
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị với ID ${id}`);
    }
    return equipment;
  }

  // -------------------------------------------------------------
  // RENTAL TICKET CREATION (ATOMIC CONCURRENCY-SAFE)
  // -------------------------------------------------------------

  async createRentalTicket(cashierId: string, dto: CreateRentalTicketDto): Promise<RentalTicket> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách dụng cụ thuê không được để trống.');
    }

    const deductedItems: { equipmentId: string; quantity: number }[] = [];
    const ticketItems: RentalTicketItem[] = [];
    let totalRentalAmount = 0;
    let totalDepositAmount = 0;
    const rentalHours = dto.rentalHours && dto.rentalHours > 0 ? dto.rentalHours : 2;

    try {
      // Atomic deduction for each item to prevent overselling
      for (const orderItem of dto.items) {
        const updatedEquipment = await this.equipmentModel.findOneAndUpdate(
          {
            _id: new Types.ObjectId(orderItem.equipmentId),
            availableQuantity: { $gte: orderItem.quantity },
            isActive: true,
          },
          {
            $inc: {
              availableQuantity: -orderItem.quantity,
              rentedQuantity: orderItem.quantity,
            },
          },
          { new: true },
        );

        if (!updatedEquipment) {
          throw new ConflictException(
            `Thiết bị ID '${orderItem.equipmentId}' không đủ số lượng khả dụng hoặc đang bị khóa.`,
          );
        }

        deductedItems.push({
          equipmentId: orderItem.equipmentId,
          quantity: orderItem.quantity,
        });

        // Calculate pricing
        let subtotalPrice = 0;
        if (updatedEquipment.pricingType === RentalPricingType.HOURLY) {
          subtotalPrice = updatedEquipment.price * rentalHours * orderItem.quantity;
        } else {
          // PER_TURN
          subtotalPrice = updatedEquipment.price * orderItem.quantity;
        }

        const subtotalDeposit = (updatedEquipment.depositAmount || 0) * orderItem.quantity;
        totalRentalAmount += subtotalPrice;
        totalDepositAmount += subtotalDeposit;

        ticketItems.push({
          equipmentId: updatedEquipment._id as Types.ObjectId,
          code: updatedEquipment.code,
          name: updatedEquipment.name,
          quantity: orderItem.quantity,
          unitPrice: updatedEquipment.price,
          depositPerUnit: updatedEquipment.depositAmount || 0,
          pricingType: updatedEquipment.pricingType,
          subtotalPrice,
          subtotalDeposit,
        });
      }
    } catch (error) {
      // Rollback already deducted equipment if any failure occurs
      for (const rollbackItem of deductedItems) {
        await this.equipmentModel.findByIdAndUpdate(rollbackItem.equipmentId, {
          $inc: {
            availableQuantity: rollbackItem.quantity,
            rentedQuantity: -rollbackItem.quantity,
          },
        });
      }
      throw error;
    }

    // Generate ticket code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `RNT-${dateStr}-${randomHex}`;

    const now = new Date();
    const dueAt = new Date(now.getTime() + rentalHours * 60 * 60 * 1000);

    const ticket = new this.rentalTicketModel({
      ticketCode,
      shiftId: dto.shiftId ? new Types.ObjectId(dto.shiftId) : undefined,
      cashierId: new Types.ObjectId(cashierId),
      customerId: dto.customerId ? new Types.ObjectId(dto.customerId) : undefined,
      customerPhone: dto.customerPhone.trim(),
      customerName: dto.customerName?.trim(),
      bookingId: dto.bookingId ? new Types.ObjectId(dto.bookingId) : undefined,
      items: ticketItems,
      rentedAt: now,
      dueAt,
      totalRentalAmount,
      totalDepositAmount,
      totalPenaltyFee: 0,
      refundDepositAmount: totalDepositAmount,
      paymentMethod: dto.paymentMethod || PaymentProvider.CASH,
      status: RentalTicketStatus.RENTING,
      notes: dto.notes,
    });

    return ticket.save();
  }

  // -------------------------------------------------------------
  // RENTAL TICKET RETURN & DAMAGE/LOST SETTLEMENT
  // -------------------------------------------------------------

  async returnRentalTicket(ticketId: string, dto: ReturnRentalTicketDto): Promise<RentalTicket> {
    const ticket = await this.rentalTicketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Không tìm thấy phiếu thuê với ID ${ticketId}`);
    }

    if (ticket.status !== RentalTicketStatus.RENTING) {
      throw new BadRequestException(`Phiếu thuê '${ticket.ticketCode}' đã được quyết toán hoặc đã hủy.`);
    }

    let totalPenaltyFee = 0;

    for (const returnItem of dto.items) {
      const equipment = await this.equipmentModel.findById(returnItem.equipmentId);
      if (!equipment) continue;

      let penalty = returnItem.customPenaltyFee || 0;

      if (returnItem.condition === RentalItemCondition.GOOD) {
        // Return back to available
        await this.equipmentModel.findByIdAndUpdate(returnItem.equipmentId, {
          $inc: {
            availableQuantity: returnItem.quantity,
            rentedQuantity: -returnItem.quantity,
          },
        });
      } else if (returnItem.condition === RentalItemCondition.DAMAGED) {
        // Damage fee and segregate to damagedQuantity
        penalty = penalty || (equipment.damageFee || 0) * returnItem.quantity;
        await this.equipmentModel.findByIdAndUpdate(returnItem.equipmentId, {
          $inc: {
            damagedQuantity: returnItem.quantity,
            rentedQuantity: -returnItem.quantity,
          },
        });
      } else if (returnItem.condition === RentalItemCondition.LOST) {
        // Lost fee and segregate to damagedQuantity
        penalty = penalty || (equipment.lostFee || 0) * returnItem.quantity;
        await this.equipmentModel.findByIdAndUpdate(returnItem.equipmentId, {
          $inc: {
            damagedQuantity: returnItem.quantity,
            rentedQuantity: -returnItem.quantity,
          },
        });
      }

      totalPenaltyFee += penalty;

      // Update condition in ticket item
      const itemInTicket = ticket.items.find(
        (i) => i.equipmentId.toString() === returnItem.equipmentId.toString(),
      );
      if (itemInTicket) {
        itemInTicket.returnCondition = returnItem.condition;
        itemInTicket.penaltyFee = penalty;
      }
    }

    // Refund calculation
    const refundDepositAmount = Math.max(0, ticket.totalDepositAmount - totalPenaltyFee);

    ticket.returnedAt = new Date();
    ticket.totalPenaltyFee = totalPenaltyFee;
    ticket.refundDepositAmount = refundDepositAmount;
    ticket.status = RentalTicketStatus.RETURNED;
    if (dto.notes) {
      ticket.notes = ticket.notes ? `${ticket.notes} | ${dto.notes}` : dto.notes;
    }

    return ticket.save();
  }

  // -------------------------------------------------------------
  // QUERY & SHIFT AUDIT
  // -------------------------------------------------------------

  async findAllTickets(query: {
    status?: RentalTicketStatus;
    customerPhone?: string;
    shiftId?: string;
    bookingId?: string;
  }): Promise<RentalTicket[]> {
    const filter: Record<string, any> = {};

    if (query.status) filter.status = query.status;
    if (query.customerPhone) filter.customerPhone = query.customerPhone.trim();
    if (query.shiftId) filter.shiftId = new Types.ObjectId(query.shiftId);
    if (query.bookingId) filter.bookingId = new Types.ObjectId(query.bookingId);

    return this.rentalTicketModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findTicketById(id: string): Promise<RentalTicket> {
    const ticket = await this.rentalTicketModel.findById(id).exec();
    if (!ticket) {
      throw new NotFoundException(`Không tìm thấy phiếu thuê với ID ${id}`);
    }
    return ticket;
  }

  async checkUnreturnedRentalsForShift(shiftId: string): Promise<{
    hasUnreturned: boolean;
    unreturnedCount: number;
    tickets: RentalTicket[];
  }> {
    const unreturnedTickets = await this.rentalTicketModel.find({
      shiftId: new Types.ObjectId(shiftId),
      status: RentalTicketStatus.RENTING,
    }).exec();

    return {
      hasUnreturned: unreturnedTickets.length > 0,
      unreturnedCount: unreturnedTickets.length,
      tickets: unreturnedTickets,
    };
  }

  // -------------------------------------------------------------
  // REPORTS & DASHBOARD METRICS (EPIC E16)
  // -------------------------------------------------------------

  async getEquipmentStats() {
    const equipments = await this.equipmentModel.find({ isActive: true }).exec();

    let totalEquipments = equipments.length;
    let totalStock = 0;
    let totalRented = 0;
    let totalDamaged = 0;
    let totalAvailable = 0;

    const sportBreakdown: Record<string, { totalQty: number; rentedQty: number; damagedQty: number; availableQty: number }> = {};

    for (const eq of equipments) {
      totalStock += eq.totalQuantity;
      totalRented += eq.rentedQuantity;
      totalDamaged += eq.damagedQuantity;
      totalAvailable += eq.availableQuantity;

      const st = eq.sportType || 'GENERAL';
      if (!sportBreakdown[st]) {
        sportBreakdown[st] = { totalQty: 0, rentedQty: 0, damagedQty: 0, availableQty: 0 };
      }
      sportBreakdown[st].totalQty += eq.totalQuantity;
      sportBreakdown[st].rentedQty += eq.rentedQuantity;
      sportBreakdown[st].damagedQty += eq.damagedQuantity;
      sportBreakdown[st].availableQty += eq.availableQuantity;
    }

    const totalActiveTickets = await this.rentalTicketModel.countDocuments({ status: RentalTicketStatus.RENTING });
    const totalReturnedTickets = await this.rentalTicketModel.countDocuments({ status: RentalTicketStatus.RETURNED });

    return {
      totalEquipments,
      totalStock,
      totalRented,
      totalDamaged,
      totalAvailable,
      totalActiveTickets,
      totalReturnedTickets,
      sportBreakdown,
    };
  }
}
