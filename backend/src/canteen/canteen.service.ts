import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';
import { OrderStatus, PaymentProvider, OrderItemType, ShiftStatus } from '../common/enums';

export interface CanteenProduct {
  id: string;
  name: string;
  category: 'DRINK' | 'SOFT_DRINK' | 'SNACK' | 'COMBO';
  price: number;
  stock: number;
  unit: string;
  imageUrl?: string;
}

@Injectable()
export class CanteenService {
  private readonly logger = new Logger(CanteenService.name);

  private products: CanteenProduct[] = [
    {
      id: 'p-pocari',
      name: 'Nước điện giải Pocari Sweat 500ml',
      category: 'DRINK',
      price: 20000,
      stock: 150,
      unit: 'Chai',
      imageUrl: '/images/canteen/pocari.png',
    },
    {
      id: 'p-redbull',
      name: 'Nước tăng lực RedBull lon vàng',
      category: 'SOFT_DRINK',
      price: 20000,
      stock: 120,
      unit: 'Lon',
      imageUrl: '/images/canteen/redbull.png',
    },
    {
      id: 'p-aquafina',
      name: 'Nước tinh khiết Aquafina 500ml',
      category: 'DRINK',
      price: 10000,
      stock: 300,
      unit: 'Chai',
      imageUrl: '/images/canteen/aquafina.png',
    },
    {
      id: 'p-revive',
      name: 'Nước bù khoáng Revive Chanh Muối',
      category: 'DRINK',
      price: 15000,
      stock: 180,
      unit: 'Chai',
      imageUrl: '/images/canteen/revive.png',
    },
    {
      id: 'p-banhmi',
      name: 'Bánh mì nướng kẹp xúc xích nóng',
      category: 'SNACK',
      price: 25000,
      stock: 45,
      unit: 'Ổ',
      imageUrl: '/images/canteen/banhmi.png',
    },
    {
      id: 'p-snack',
      name: 'Snack khoai tây Oishi phô mai',
      category: 'SNACK',
      price: 12000,
      stock: 80,
      unit: 'Gói',
      imageUrl: '/images/canteen/snack.png',
    },
    {
      id: 'p-mily',
      name: 'Mì ly Modern bò hầm chua cay',
      category: 'SNACK',
      price: 18000,
      stock: 60,
      unit: 'Ly',
      imageUrl: '/images/canteen/mily.png',
    },
    {
      id: 'p-combo-1',
      name: 'Combo Tiếp Sức (1 Revive + 1 Bánh Mì)',
      category: 'COMBO',
      price: 35000,
      stock: 40,
      unit: 'Combo',
      imageUrl: '/images/canteen/combo.png',
    },
  ];

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
  ) {}

  async getProducts(category?: string): Promise<any> {
    if (category && category !== 'ALL') {
      const filtered = this.products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase(),
      );
      return { total: filtered.length, items: filtered };
    }
    return { total: this.products.length, items: this.products };
  }

  async createOrder(dto: any, cashierUser?: any): Promise<any> {
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không được để trống');
    }

    let subtotal = 0;
    const orderItems = dto.items.map((item: any) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Number(item.unitPrice) || 0;
      const total = qty * price;
      subtotal += total;

      // Giảm stock in-memory nếu tìm thấy
      const prod = this.products.find((p) => p.id === item.itemId || p.name === item.name);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - qty);
      }

      return {
        itemId: item.itemId || item.id || 'custom',
        name: item.name,
        type: OrderItemType.PRODUCT,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
      };
    });

    const discountAmount = Number(dto.discountAmount) || 0;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const vatRate = 8;
    const vatAmount = Math.round(taxableAmount * 0.08);
    const finalTotal = taxableAmount + vatAmount;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const orderCode = `HD-${dateStr}-${randSuffix}`;

    const paymentMethod = dto.paymentMethod || PaymentProvider.CASH;

    const newOrder = new this.orderModel({
      orderCode,
      cashierId: cashierUser?.userId ? new Types.ObjectId(cashierUser.userId) : undefined,
      customerName: dto.customerName || 'Khách vãng lai F&B',
      customerPhone: dto.customerPhone || '0900000000',
      items: orderItems,
      subtotal,
      discountAmount,
      vatRate,
      vatAmount,
      finalTotal,
      paymentMethod,
      status: OrderStatus.COMPLETED,
    });

    const saved = await newOrder.save();
    this.logger.log(`🛒 Tạo đơn F&B Căng tin thành công: Mã ${orderCode} - Tổng ${finalTotal}đ`);

    // Tự động cộng doanh thu vào ca làm việc hiện tại của thu ngân nếu có ca mở
    if (cashierUser?.userId) {
      try {
        const activeShift = await this.shiftModel.findOne({
          cashierId: new Types.ObjectId(cashierUser.userId),
          status: ShiftStatus.OPEN,
        });
        if (activeShift) {
          if (paymentMethod === PaymentProvider.CASH) {
            activeShift.cashRevenue = (activeShift.cashRevenue || 0) + finalTotal;
            activeShift.expectedCash = (activeShift.expectedCash || activeShift.initialCash) + finalTotal;
          } else {
            activeShift.vietQrTotal = (activeShift.vietQrTotal || 0) + finalTotal;
          }
          await activeShift.save();
        }
      } catch (err) {
        this.logger.warn(`Không thể cập nhật ca thu ngân: ${err.message}`);
      }
    }

    return {
      orderId: saved._id,
      orderCode: saved.orderCode,
      customerName: saved.customerName,
      customerPhone: saved.customerPhone,
      items: saved.items,
      subtotal: saved.subtotal,
      vatAmount: saved.vatAmount,
      finalTotal: saved.finalTotal,
      paymentMethod: saved.paymentMethod,
      status: saved.status,
      createdAt: (saved as any).createdAt || new Date(),
    };
  }
}
