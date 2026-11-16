import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from '../schemas/equipment.schema.js';
import { CreateEquipmentDto, UpdateEquipmentDto, EquipmentListQueryDto } from '@sports/contracts';
import { RentalItemCondition } from '@sports/shared';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name) private readonly equipmentModel: Model<EquipmentDocument>,
  ) {}

  async createEquipment(dto: CreateEquipmentDto): Promise<EquipmentDocument> {
    const existing = await this.equipmentModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException({
        code: 'CODE_EXISTS',
        message: `Mã dụng cụ ${dto.code} đã tồn tại trong hệ thống`,
      });
    }

    const availableQuantity = dto.totalQuantity;
    const equipment = new this.equipmentModel({
      ...dto,
      code: dto.code.toUpperCase(),
      rentedQuantity: 0,
      damagedQuantity: 0,
      availableQuantity,
    });

    return equipment.save();
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto): Promise<EquipmentDocument> {
    const equipment = await this.findById(id);

    if (dto.code && dto.code.toUpperCase() !== equipment.code) {
      const existing = await this.equipmentModel.findOne({
        code: dto.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException({
          code: 'CODE_EXISTS',
          message: `Mã dụng cụ ${dto.code} đã tồn tại trong hệ thống`,
        });
      }
    }

    let availableQuantity = equipment.availableQuantity;
    if (dto.totalQuantity !== undefined) {
      const rented = equipment.rentedQuantity ?? 0;
      const damaged = equipment.damagedQuantity ?? 0;
      if (dto.totalQuantity < rented + damaged) {
        throw new BadRequestException({
          code: 'INVALID_TOTAL_QUANTITY',
          message: `Tổng số lượng không thể nhỏ hơn số lượng đang thuê (${rented}) và hỏng/mất (${damaged})`,
        });
      }
      availableQuantity = dto.totalQuantity - rented - damaged;
    }

    Object.assign(equipment, {
      ...dto,
      code: dto.code ? dto.code.toUpperCase() : equipment.code,
      availableQuantity,
    });

    return equipment.save();
  }

  async findById(id: string): Promise<EquipmentDocument> {
    const equipment = await this.equipmentModel.findById(id);
    if (!equipment) {
      throw new NotFoundException({
        code: 'EQUIPMENT_NOT_FOUND',
        message: 'Không tìm thấy dụng cụ thể thao',
      });
    }
    return equipment;
  }

  async findByCode(code: string): Promise<EquipmentDocument | null> {
    return this.equipmentModel.findOne({ code: code.toUpperCase(), isActive: true });
  }

  async findAll(query: EquipmentListQueryDto): Promise<{ items: EquipmentDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (query.sportType) {
      filter.sportType = query.sportType;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search.trim(), $options: 'i' } },
        { code: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    if (query.availableOnly) {
      filter.availableQuantity = { $gt: 0 };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.equipmentModel.find(filter).sort({ code: 1 }).skip(skip).limit(limit).exec(),
      this.equipmentModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  /**
   * Bất biến Race Condition Defense (F13.3 / SPEC Rule 1):
   * Trừ số lượng khả dụng nguyên tử khi tạo phiếu thuê
   */
  async reserveEquipments(items: { equipmentId: string; quantity: number }[]): Promise<void> {
    const reserved: { equipmentId: string; quantity: number }[] = [];

    for (const item of items) {
      const equipment = await this.equipmentModel.findById(item.equipmentId);
      if (!equipment || !equipment.isActive) {
        await this.rollbackReservation(reserved);
        throw new NotFoundException({
          code: 'EQUIPMENT_NOT_FOUND',
          message: `Dụng cụ ID ${item.equipmentId} không tồn tại hoặc đã ngừng cho thuê`,
        });
      }

      const updated = await this.equipmentModel.findOneAndUpdate(
        {
          _id: equipment._id,
          isActive: true,
          availableQuantity: { $gte: item.quantity },
        },
        {
          $inc: {
            availableQuantity: -item.quantity,
            rentedQuantity: item.quantity,
          },
        },
        { new: true },
      );

      if (!updated) {
        await this.rollbackReservation(reserved);
        throw new BadRequestException({
          code: 'INSUFFICIENT_EQUIPMENT',
          message: `Dụng cụ "${equipment.name}" không đủ số lượng khả dụng (yêu cầu: ${item.quantity}, hiện có: ${equipment.availableQuantity})`,
        });
      }

      reserved.push({ equipmentId: item.equipmentId, quantity: item.quantity });
    }
  }

  async rollbackReservation(items: { equipmentId: string; quantity: number }[]): Promise<void> {
    for (const item of items) {
      await this.equipmentModel.updateOne(
        { _id: item.equipmentId },
        {
          $inc: {
            availableQuantity: item.quantity,
            rentedQuantity: -item.quantity,
          },
        },
      );
    }
  }

  /**
   * F13.4: Hoàn trả dụng cụ khi khách trả đồ:
   * - Món tốt: Cộng lại availableQuantity, trừ rentedQuantity
   * - Món hỏng/mất: Cộng vào damagedQuantity, trừ rentedQuantity (cách ly khỏi availableQuantity!)
   */
  async releaseEquipments(
    items: { equipmentId: string; quantity: number; condition?: RentalItemCondition }[],
  ): Promise<void> {
    for (const item of items) {
      const condition = item.condition ?? RentalItemCondition.GOOD;

      if (condition === RentalItemCondition.GOOD) {
        await this.equipmentModel.updateOne(
          { _id: item.equipmentId },
          {
            $inc: {
              availableQuantity: item.quantity,
              rentedQuantity: -item.quantity,
            },
          },
        );
      } else {
        // Hỏng hoặc Mất: Chuyển thẳng sang damagedQuantity, không đưa lại vào availableQuantity
        await this.equipmentModel.updateOne(
          { _id: item.equipmentId },
          {
            $inc: {
              damagedQuantity: item.quantity,
              rentedQuantity: -item.quantity,
            },
          },
        );
      }
    }
  }
}
