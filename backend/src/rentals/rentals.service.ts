import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RentalItem, RentalItemDocument } from './schemas/rental-item.schema';
import { RentalTicket, RentalTicketDocument } from './schemas/rental-ticket.schema';
import { RentalItemType, SportCategory } from '../common/enums';

@Injectable()
export class RentalsService {
  private readonly logger = new Logger(RentalsService.name);

  private defaultItems = [
    {
      _id: 'rent-item-1',
      name: 'Bóng đá Molten Vantaggio 5000',
      type: RentalItemType.BALL,
      sportCategory: SportCategory.SOCCER,
      rentalPricePerSlot: 50000,
      depositPrice: 200000,
      stockQty: 30,
      availableQty: 25,
      isActive: true,
    },
    {
      _id: 'rent-item-2',
      name: 'Bộ Áo Bib Phân Đội (10 Áo Cam/Xanh)',
      type: RentalItemType.BIB,
      sportCategory: SportCategory.SOCCER,
      rentalPricePerSlot: 40000,
      depositPrice: 100000,
      stockQty: 20,
      availableQty: 18,
      isActive: true,
    },
    {
      _id: 'rent-item-3',
      name: 'Vợt Cầu Lông Yonex Nanoflare 800',
      type: RentalItemType.RACKET,
      sportCategory: SportCategory.BADMINTON,
      rentalPricePerSlot: 40000,
      depositPrice: 300000,
      stockQty: 24,
      availableQty: 20,
      isActive: true,
    },
    {
      _id: 'rent-item-4',
      name: 'Vợt Tennis Wilson Pro Staff v14',
      type: RentalItemType.RACKET,
      sportCategory: SportCategory.TENNIS,
      rentalPricePerSlot: 70000,
      depositPrice: 500000,
      stockQty: 15,
      availableQty: 12,
      isActive: true,
    },
  ];

  constructor(
    @InjectModel(RentalItem.name) private rentalItemModel: Model<RentalItemDocument>,
    @InjectModel(RentalTicket.name) private rentalTicketModel: Model<RentalTicketDocument>,
  ) {}

  async getItems(sport?: string): Promise<any> {
    try {
      const query: any = { isActive: true };
      if (sport && sport !== 'ALL') {
        query.sportCategory = sport.toUpperCase();
      }
      const items = await this.rentalItemModel.find(query).exec();
      if (items && items.length > 0) {
        return { total: items.length, items };
      }
    } catch (e) {
      // Fallback
    }

    let list = this.defaultItems;
    if (sport && sport !== 'ALL') {
      list = list.filter((i) => i.sportCategory === sport.toUpperCase());
    }
    return { total: list.length, items: list };
  }

  async rent(dto: any): Promise<any> {
    const qty = Math.max(1, Number(dto.quantity) || 1);
    const itemName = dto.itemName || 'Dụng cụ thể thao';
    const itemId = dto.itemId || 'rent-item-1';

    let item = await this.rentalItemModel.findById(itemId).exec().catch(() => null);
    let rentalPrice = 50000;
    let depositPrice = 200000;

    if (item) {
      if (item.availableQty < qty) {
        throw new BadRequestException(`Không đủ số lượng khả dụng (Còn ${item.availableQty})`);
      }
      item.availableQty -= qty;
      await item.save();
      rentalPrice = item.rentalPricePerSlot;
      depositPrice = item.depositPrice;
    } else {
      const foundDefault = this.defaultItems.find((d) => d._id === itemId || d.name === itemName);
      if (foundDefault) {
        if (foundDefault.availableQty < qty) {
          throw new BadRequestException(`Không đủ số lượng khả dụng (Còn ${foundDefault.availableQty})`);
        }
        foundDefault.availableQty -= qty;
        rentalPrice = foundDefault.rentalPricePerSlot;
        depositPrice = foundDefault.depositPrice;
      }
    }

    const rentalFee = rentalPrice * qty;
    const depositAmount = depositPrice * qty;
    const totalCollected = rentalFee + depositAmount;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const ticketCode = `RENT-${dateStr}-${randSuffix}`;

    const ticket = new this.rentalTicketModel({
      ticketCode,
      itemId: String(itemId),
      itemName: item?.name || itemName,
      quantity: qty,
      customerName: dto.customerName || 'Khách vãng lai thuê đồ',
      customerPhone: dto.customerPhone || '0987654321',
      depositAmount,
      rentalFee,
      totalCollected,
      status: 'RENTING',
      rentedAt: new Date(),
    });

    const saved = await ticket.save();
    this.logger.log(`🎾 Cho thuê dụng cụ thành công: ${ticketCode} - ${saved.itemName} x${qty}`);

    return {
      ticketCode: saved.ticketCode,
      itemName: saved.itemName,
      quantity: saved.quantity,
      customerName: saved.customerName,
      customerPhone: saved.customerPhone,
      rentalFee: saved.rentalFee,
      depositAmount: saved.depositAmount,
      totalCollected: saved.totalCollected,
      status: saved.status,
      rentedAt: saved.rentedAt,
    };
  }

  async returnRental(dto: any): Promise<any> {
    const ticketCode = dto.ticketCode || dto.id;
    if (!ticketCode) {
      throw new BadRequestException('Mã phiếu thuê không được để trống');
    }

    const ticket = await this.rentalTicketModel.findOne({
      $or: [{ ticketCode }, { _id: ticketCode.match(/^[0-9a-fA-F]{24}$/) ? ticketCode : null }],
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy phiếu thuê dụng cụ');
    }

    if (ticket.status === 'RETURNED') {
      throw new BadRequestException('Phiếu này đã được hoàn trả trước đó');
    }

    ticket.status = 'RETURNED';
    ticket.returnedAt = new Date();
    await ticket.save();

    // Khôi phục availableQty
    try {
      const item = await this.rentalItemModel.findById(ticket.itemId);
      if (item) {
        item.availableQty = Math.min(item.stockQty, item.availableQty + ticket.quantity);
        await item.save();
      } else {
        const foundDefault = this.defaultItems.find((d) => d._id === ticket.itemId);
        if (foundDefault) {
          foundDefault.availableQty = Math.min(foundDefault.stockQty, foundDefault.availableQty + ticket.quantity);
        }
      }
    } catch (e) {
      // Ignore
    }

    this.logger.log(`✅ Trả dụng cụ và hoàn cọc thành công: ${ticket.ticketCode} - Hoàn ${ticket.depositAmount}đ`);

    return {
      ticketCode: ticket.ticketCode,
      itemName: ticket.itemName,
      quantity: ticket.quantity,
      customerName: ticket.customerName,
      depositRefunded: ticket.depositAmount,
      status: 'RETURNED',
      returnedAt: ticket.returnedAt,
      message: 'Hoàn trả dụng cụ và cọc thành công',
    };
  }

  async getTickets(status?: string): Promise<any> {
    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    const tickets = await this.rentalTicketModel.find(query).sort({ createdAt: -1 }).limit(50).exec();
    return { total: tickets.length, items: tickets };
  }
}
