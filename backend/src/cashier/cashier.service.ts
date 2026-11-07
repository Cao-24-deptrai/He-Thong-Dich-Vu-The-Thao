import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EventsGateway } from '../events/events.gateway';
import { MailService } from '../mail/mail.service';
import { ShiftStatus, BookingStatus, OrderStatus, BookingSource, PaymentProvider, PaymentStatus } from '../common/enums';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CashierWalkInDto } from './dto/cashier-walk-in.dto';

@Injectable()
export class CashierService {
  private readonly logger = new Logger(CashierService.name);

  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventsGateway: EventsGateway,
    private mailService: MailService,
  ) {}

  /**
   * Tính toán doanh thu thực tế phát sinh trong ca làm việc
   */
  private async calculateShiftLiveFinancials(openedAt: Date, closedAt?: Date) {
    const timeFilter: any = { createdAt: { $gte: openedAt } };
    if (closedAt) {
      timeFilter.createdAt.$lte = closedAt;
    }

    // 1. Tiền mặt từ hóa đơn POS bán lẻ & căng tin
    const cashOrders = await this.orderModel.find({
      ...timeFilter,
      paymentMethod: 'CASH',
      status: OrderStatus.COMPLETED,
    }).lean().exec();

    let cashRevenue = 0;
    for (const o of cashOrders) {
      cashRevenue += o.finalTotal || 0;
    }

    // 2. Chuyển khoản VietQR từ hóa đơn POS
    const qrOrders = await this.orderModel.find({
      ...timeFilter,
      paymentMethod: { $in: ['VIETQR', 'PAYOS'] },
      status: OrderStatus.COMPLETED,
    }).lean().exec();

    let vietQrTotal = 0;
    for (const o of qrOrders) {
      vietQrTotal += o.finalTotal || 0;
    }

    // 3. Doanh thu đặt sân walk-in hoặc thanh toán tiền mặt tại quầy trong ca
    const cashBookings = await this.bookingModel.find({
      ...timeFilter,
      paymentMethod: 'CASH',
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
    }).lean().exec();

    for (const b of cashBookings) {
      cashRevenue += b.totalPrice || 0;
    }

    // 4. Doanh thu đặt sân chuyển khoản VietQR tại quầy trong ca
    const qrBookings = await this.bookingModel.find({
      ...timeFilter,
      paymentMethod: { $in: ['VIETQR', 'PAYOS'] },
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
    }).lean().exec();

    for (const b of qrBookings) {
      vietQrTotal += b.totalPrice || 0;
    }

    // 5. Hoàn tiền mặt tại quầy trong ca (nếu có)
    const refundBookings = await this.bookingModel.find({
      ...timeFilter,
      paymentMethod: 'CASH',
      status: BookingStatus.REFUNDED,
    }).lean().exec();

    let cashRefunds = 0;
    for (const b of refundBookings) {
      cashRefunds += b.totalPrice || 0;
    }

    return {
      cashRevenue,
      vietQrTotal,
      cashRefunds,
    };
  }

  /**
   * Lấy thông tin ca làm việc hiện tại đang mở
   */
  async getCurrentShift(cashierId?: string) {
    const filter: any = { status: ShiftStatus.OPEN };
    if (cashierId && Types.ObjectId.isValid(cashierId)) {
      filter.cashierId = new Types.ObjectId(cashierId);
    }

    let shift = await this.shiftModel.findOne(filter).sort({ openedAt: -1 }).exec();
    // Nếu không tìm thấy theo cashierId cụ thể, lấy ca OPEN bất kỳ gần nhất tại quầy
    if (!shift) {
      shift = await this.shiftModel.findOne({ status: ShiftStatus.OPEN }).sort({ openedAt: -1 }).exec();
    }

    if (!shift) {
      return {
        active: false,
        message: 'Hiện tại chưa có ca làm việc nào đang mở',
        shift: null,
      };
    }

    // Tính toán đối soát thời gian thực
    const live = await this.calculateShiftLiveFinancials(shift.openedAt);
    const expectedCash = (shift.initialCash || 0) + live.cashRevenue - live.cashRefunds;

    return {
      active: true,
      shift: {
        _id: shift._id,
        shiftCode: shift.shiftCode,
        cashierId: shift.cashierId,
        cashierName: shift.cashierName,
        openedAt: shift.openedAt,
        initialCash: shift.initialCash,
        cashRevenue: live.cashRevenue,
        vietQrTotal: live.vietQrTotal,
        cashRefunds: live.cashRefunds,
        expectedCash,
        status: shift.status,
        notes: shift.notes,
      },
    };
  }

  /**
   * Mở ca thu ngân mới (Khai báo tiền mặt đầu ca)
   */
  async openShift(cashier: { _id: string; fullName: string }, dto: OpenShiftDto) {
    // Kiểm tra quy tắc nghiệp vụ: Mỗi quầy chỉ được mở 1 ca duy nhất tại một thời điểm
    const existingOpenShift = await this.shiftModel.findOne({
      status: ShiftStatus.OPEN,
    }).exec();

    if (existingOpenShift) {
      throw new BadRequestException(
        `Đã có ca làm việc đang mở (${existingOpenShift.shiftCode} - Thu ngân: ${existingOpenShift.cashierName}). Vui lòng chốt ca trước khi mở ca mới!`,
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shiftsCountToday = await this.shiftModel.countDocuments({
      openedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    }).exec();

    const shiftCode = `CA-${todayStr}-S${shiftsCountToday + 1}`;

    const initialCash = dto.initialCash !== undefined ? dto.initialCash : (dto.openingCash !== undefined ? dto.openingCash : 0);

    const newShift = await this.shiftModel.create({
      shiftCode,
      cashierId: new Types.ObjectId(cashier._id),
      cashierName: cashier.fullName || 'Thu Ngân Phanta',
      openedAt: new Date(),
      initialCash,
      expectedCash: initialCash,
      actualCash: undefined,
      vietQrTotal: 0,
      difference: 0,
      status: ShiftStatus.OPEN,
      notes: dto.notes || 'Mở ca làm việc thành công',
    });

    this.logger.log(`💵 Thu ngân ${cashier.fullName} đã mở ca: ${shiftCode} với tiền đầu ca: ${initialCash.toLocaleString('vi-VN')}đ`);

    return {
      success: true,
      message: 'Mở ca làm việc thành công!',
      shift: newShift,
    };
  }

  /**
   * Chốt ca thu ngân (Đối soát két tiền & bàn giao ca)
   */
  async closeShift(cashierId: string, dto: CloseShiftDto) {
    let shift: ShiftDocument | null = null;
    if (dto.shiftId && Types.ObjectId.isValid(dto.shiftId)) {
      shift = await this.shiftModel.findById(dto.shiftId).exec();
    } else {
      shift = await this.shiftModel.findOne({ status: ShiftStatus.OPEN }).sort({ openedAt: -1 }).exec();
    }

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc đang mở để thực hiện chốt ca');
    }

    if (shift.status === ShiftStatus.CLOSED) {
      throw new BadRequestException(`Ca làm việc ${shift.shiftCode} đã được chốt trước đó`);
    }

    const closedAt = new Date();
    const live = await this.calculateShiftLiveFinancials(shift.openedAt, closedAt);
    const expectedCash = (shift.initialCash || 0) + live.cashRevenue - live.cashRefunds;

    let actualCash = dto.actualCash;
    if (dto.denominations) {
      let countedFromDenominations = 0;
      for (const [denom, count] of Object.entries(dto.denominations)) {
        countedFromDenominations += Number(denom) * Number(count || 0);
      }
      if (actualCash === undefined || actualCash === null) {
        actualCash = countedFromDenominations;
      }
    }
    if (actualCash === undefined || actualCash === null) {
      actualCash = expectedCash;
    }

    const difference = actualCash - expectedCash;

    shift.closedAt = closedAt;
    shift.expectedCash = expectedCash;
    shift.actualCash = actualCash;
    shift.vietQrTotal = live.vietQrTotal;
    shift.cashRevenue = live.cashRevenue;
    shift.cashRefunds = live.cashRefunds;
    shift.difference = difference;
    shift.denominations = dto.denominations;
    shift.status = ShiftStatus.CLOSED;
    if (dto.notes) {
      shift.notes = dto.notes;
    }

    await shift.save();

    this.logger.log(
      `🔒 Chốt ca ${shift.shiftCode}: Thực tế ${actualCash.toLocaleString('vi-VN')}đ, Lý thuyết ${expectedCash.toLocaleString('vi-VN')}đ, Lệch: ${difference.toLocaleString('vi-VN')}đ`,
    );

    return {
      success: true,
      message: 'Chốt ca thu ngân và đối soát két tiền thành công!',
      shift,
      summary: {
        shiftCode: shift.shiftCode,
        initialCash: shift.initialCash,
        cashRevenue: live.cashRevenue,
        cashRefunds: live.cashRefunds,
        expectedCash,
        actualCash,
        difference,
        cashDifference: difference,
        vietQrTotal: live.vietQrTotal,
        isMatched: difference === 0,
      },
    };
  }

  /**
   * Danh sách lịch sử các ca làm việc
   */
  async getShiftHistory(page = 1, limit = 10): Promise<any> {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 10);
    const skip = (p - 1) * l;

    const [items, totalCount] = await Promise.all([
      this.shiftModel.find().sort({ openedAt: -1 }).skip(skip).limit(l).lean().exec(),
      this.shiftModel.countDocuments().exec(),
    ]);

    return {
      items: items.map((s, idx) => ({
        ...s,
        stt: skip + idx + 1,
      })),
      totalCount,
      page: p,
      limit: l,
      totalPages: Math.ceil(totalCount / l),
    };
  }

  /**
   * Dữ liệu in biên bản chốt ca 80mm
   */
  async getShiftReportData(shiftId: string) {
    if (!Types.ObjectId.isValid(shiftId)) {
      throw new BadRequestException('Shift ID không hợp lệ');
    }

    const shift = await this.shiftModel.findById(shiftId).lean().exec();
    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc');
    }

    return {
      companyName: 'TỔ HỢP THỂ THAO PHANTA SPORTS',
      address: 'Số 1 Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
      hotline: '1900 8888',
      title: 'BIÊN BẢN BÀN GIAO & CHỐT CA THU NGÂN',
      shiftCode: shift.shiftCode,
      cashierName: shift.cashierName,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt || new Date(),
      initialCash: shift.initialCash,
      cashRevenue: shift.cashRevenue || 0,
      cashRefunds: shift.cashRefunds || 0,
      expectedCash: shift.expectedCash,
      actualCash: shift.actualCash || shift.expectedCash,
      difference: shift.difference || 0,
      vietQrTotal: shift.vietQrTotal,
      denominations: shift.denominations || {},
      notes: shift.notes || 'Bàn giao ca thành công',
      status: shift.status,
    };
  }

  /**
   * Đặt sân Walk-in tại quầy thu ngân (Tự động sinh mã vé, tính thuế VAT & lưu doanh thu)
   */
  async createWalkIn(cashier: any, dto: CashierWalkInDto) {
    if (!Types.ObjectId.isValid(dto.venueId)) {
      throw new BadRequestException('Venue ID không hợp lệ');
    }

    const venue = await this.venueModel.findById(dto.venueId).exec();
    if (!venue) {
      throw new NotFoundException('Không tìm thấy sân thể thao');
    }

    // Tính thời lượng
    const [startH, startM] = dto.startTime.split(':').map(Number);
    const [endH, endM] = dto.endTime.split(':').map(Number);
    let durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
    if (durationHours <= 0) durationHours = 1;

    // Kiểm tra giờ cao điểm (17:00 - 21:00)
    const isPeakHour =
      (dto.startTime >= '17:00' && dto.startTime < '21:00') ||
      (dto.endTime > '17:00' && dto.endTime <= '21:30');
    const multiplier = isPeakHour ? 1.3 : 1.0;
    const courtBasePrice = Math.round((venue.basePricePerHour || 250000) * durationHours * multiplier);

    // Tính tiền thuê dụng cụ
    let rentalsTotal = 0;
    if (dto.equipmentRentals && dto.equipmentRentals.length > 0) {
      for (const eq of dto.equipmentRentals) {
        rentalsTotal += (eq.price || 0) * (eq.quantity || 1);
      }
    }

    const discountAmount = dto.discountAmount || 0;
    const subtotal = Math.max(0, courtBasePrice + rentalsTotal - discountAmount);
    const vatRate = 8;
    const vatAmount = Math.round(subtotal * 0.08);
    const totalPrice = subtotal + vatAmount;

    // Kiểm tra xung đột với đơn đặt chỗ hiện có (online hoặc giữ chỗ chưa hết hạn)
    const bookingDate = new Date(`${dto.bookingDate}T00:00:00.000Z`);
    const now = new Date();
    const overlapping = await this.bookingModel.findOne({
      venueId: venue._id,
      bookingDate,
      startTime: { $lt: dto.endTime },
      endTime: { $gt: dto.startTime },
      status: { $in: [BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
    }).exec();

    if (overlapping) {
      if (overlapping.status === BookingStatus.HELD && overlapping.holdExpiresAt && overlapping.holdExpiresAt <= now) {
        overlapping.status = BookingStatus.EXPIRED;
        await overlapping.save();
      } else {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SLOT_ALREADY_TAKEN_ONLINE',
          message: 'Khung giờ này đã có khách giữ chỗ hoặc đặt online, vui lòng chọn slot khác!',
        });
      }
    }

    // Sinh mã check-in thân thiện và duy nhất
    const count = await this.bookingModel.countDocuments().exec();
    let checkInCode = `PHANTA-BK${1000 + count + 1}`;
    const codeExists = await this.bookingModel.exists({ checkInCode });
    if (codeExists) {
      checkInCode = `PHANTA-BK${1000 + Math.floor(Math.random() * 9000)}`;
    }

    const status = dto.checkInImmediately ? BookingStatus.CHECKED_IN : BookingStatus.CONFIRMED;
    const isCheckedIn = dto.checkInImmediately || false;
    const checkedInAt = dto.checkInImmediately ? new Date() : undefined;

    let booking: BookingDocument;
    try {
      booking = await this.bookingModel.create({
        userId: null,
        venueId: venue._id,
        bookingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalPrice,
        bookingSource: BookingSource.WALK_IN,
        status,
        checkInCode,
        isCheckedIn,
        checkedInAt,
        isWalkIn: true,
        customerName: dto.customerName || 'Khách vãng lai tại quầy',
        customerPhone: dto.customerPhone || 'N/A',
        paymentMethod: dto.paymentMethod || 'CASH',
        equipmentRentals: dto.equipmentRentals || [],
        discountAmount,
        vatRate,
        vatAmount,
        note: dto.note || `Đặt Walk-in tại quầy thu ngân (${cashier?.fullName || 'Thu ngân'})`,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SLOT_ALREADY_TAKEN_ONLINE',
          message: 'Khung giờ này vừa có khách đặt chỗ, vui lòng chọn slot khác!',
        });
      }
      throw err;
    }

    // Tạo bản ghi Payment
    await this.paymentModel.create({
      bookingId: booking._id,
      amount: totalPrice,
      provider: dto.paymentMethod || PaymentProvider.CASH,
      status: PaymentStatus.SUCCESS,
      transactionId: `WALKIN-${Date.now().toString().slice(-8)}`,
    });

    // Broadcast Socket.io slot sang màu đỏ (CONFIRMED hoặc CHECKED_IN)
    this.eventsGateway.broadcastSlotStatusChanged({
      venueId: dto.venueId,
      bookingDate: dto.bookingDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status,
    });

    if (dto.checkInImmediately) {
      this.eventsGateway.broadcastCheckinSuccess({
        bookingId: booking._id.toString(),
        venueId: venue._id.toString(),
        customerName: dto.customerName || 'Khách vãng lai',
        timeSlot: `${dto.startTime} - ${dto.endTime}`,
      });
    }

    if (dto.customerEmail) {
      this.mailService
        .sendBookingInvoiceEmail({
          toEmail: dto.customerEmail,
          customerName: dto.customerName || 'Quý khách hàng',
          checkInCode,
          venueName: venue.name,
          courtCode: venue.courtCode,
          bookingDate: dto.bookingDate,
          timeSlot: `${dto.startTime} - ${dto.endTime}`,
          courtPrice: courtBasePrice,
          rentalsTotal,
          discountAmount,
          vatRate,
          vatAmount,
          finalTotal: totalPrice,
          paymentMethod: dto.paymentMethod || 'Tiền mặt tại quầy',
        })
        .catch((err) => this.logger.warn(`Lỗi gửi email hóa đơn: ${err.message}`));
    }

    return {
      success: true,
      message: dto.checkInImmediately
        ? 'Đặt sân walk-in và mở cổng check-in thành công!'
        : 'Đặt sân walk-in tại quầy thành công!',
      booking,
      receipt: {
        checkInCode,
        venueName: venue.name,
        courtCode: venue.courtCode,
        bookingDate: dto.bookingDate,
        timeSlot: `${dto.startTime} - ${dto.endTime}`,
        courtPrice: courtBasePrice,
        rentalsTotal,
        discountAmount,
        subtotal,
        vatRate,
        vatAmount,
        finalTotal: totalPrice,
        paymentMethod: dto.paymentMethod || 'CASH',
        customerName: dto.customerName || 'Khách vãng lai',
        cashierName: cashier?.fullName || 'Thu Ngân',
        createdAt: booking.createdAt,
      },
    };
  }

  /**
   * Chức năng In 1: Lấy dữ liệu hóa đơn thanh toán bán lẻ POS / Căng tin / Thuê đồ (Khổ in nhiệt 80mm)
   */
  async getReceiptPrintData(orderId: string): Promise<any> {
    if (!orderId) {
      throw new BadRequestException('Mã hóa đơn không được để trống');
    }

    const cleanId = orderId.replace(/^#/, '').trim();

    // 1. Tìm trong bảng Order (Hóa đơn POS Căng tin / Bán lẻ / Thuê đồ)
    let order: OrderDocument | null = null;
    if (Types.ObjectId.isValid(orderId)) {
      order = await this.orderModel.findById(orderId).exec();
    }
    if (!order && Types.ObjectId.isValid(cleanId)) {
      order = await this.orderModel.findById(cleanId).exec();
    }
    if (!order) {
      order = await this.orderModel.findOne({
        $or: [{ orderCode: orderId }, { orderCode: cleanId }, { orderCode: '#' + cleanId }],
      }).exec();
    }

    if (order) {
      let cashierName = 'Thu Ngân Quầy 01';
      if (order.cashierId) {
        const cashierUser = await this.userModel.findById(order.cashierId).exec();
        if (cashierUser?.fullName) {
          cashierName = cashierUser.fullName;
        }
      }

      const items = (order.items || []).map((it) => ({
        name: it.name,
        type: it.type,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        unitPriceFormatted: `${(it.unitPrice || 0).toLocaleString('vi-VN')} đ`,
        totalPriceFormatted: `${(it.totalPrice || 0).toLocaleString('vi-VN')} đ`,
      }));

      const paymentMethodText =
        order.paymentMethod === PaymentProvider.VIETQR
          ? 'Chuyển khoản VietQR'
          : order.paymentMethod === PaymentProvider.WALLET
          ? 'Ví Phanta Pay'
          : 'Tiền mặt tại quầy';

      return {
        type: 'POS_ORDER',
        storeInfo: {
          name: 'TỔ HỢP THỂ THAO VÀ GIẢI TRÍ PHANTA',
          branch: 'Chi nhánh Sân vận động Mỹ Đình',
          address: 'Số 1 Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
          hotline: '1900 8888',
          taxCode: '0317892341',
          wifi: 'Wifi: PhantaSports (Mật khẩu: phanta2026)',
          website: 'phantasports.vn',
        },
        title: 'HÓA ĐƠN THANH TOÁN BÁN LẺ',
        subTitle: 'Hệ thống quầy thanh toán tự động POS',
        invoiceNo: `#${order.orderCode}`,
        createdAt: order.createdAt,
        createdAtFormatted: new Date(order.createdAt).toLocaleString('vi-VN'),
        cashierName,
        customerName: order.customerName || 'Khách vãng lai',
        customerPhone: order.customerPhone || 'N/A',
        items,
        subtotal: order.subtotal,
        subtotalFormatted: `${(order.subtotal || 0).toLocaleString('vi-VN')} đ`,
        discountAmount: order.discountAmount || 0,
        discountAmountFormatted: `${(order.discountAmount || 0).toLocaleString('vi-VN')} đ`,
        vatRate: order.vatRate || 8,
        vatAmount: order.vatAmount || 0,
        vatAmountFormatted: `${(order.vatAmount || 0).toLocaleString('vi-VN')} đ`,
        finalTotal: order.finalTotal,
        finalTotalFormatted: `${(order.finalTotal || 0).toLocaleString('vi-VN')} đ`,
        paymentMethod: order.paymentMethod,
        paymentMethodText,
        barcodeText: `*${order.orderCode}*`,
        qrLookupCode: `PST-${order.orderCode.replace(/[^A-Za-z0-9]/g, '')}`,
        lookupUrl: 'tracuu.phantasports.vn',
        note: order.note || 'Đã thanh toán đầy đủ',
        thankYouNote: 'Cảm ơn Quý khách và Hẹn gặp lại!',
      };
    }

    // 2. Nếu không tìm thấy trong Order, tìm trong Booking (Hóa đơn đặt sân thể thao)
    let booking: BookingDocument | null = null;
    if (Types.ObjectId.isValid(orderId)) {
      booking = await this.bookingModel.findById(orderId).exec();
    }
    if (!booking && Types.ObjectId.isValid(cleanId)) {
      booking = await this.bookingModel.findById(cleanId).exec();
    }
    if (!booking) {
      booking = await this.bookingModel.findOne({
        $or: [
          { checkInCode: orderId },
          { checkInCode: cleanId },
          { checkInCode: '#' + cleanId },
        ],
      }).exec();
    }

    if (booking) {
      const venue = await this.venueModel.findById(booking.venueId).exec();
      let customerName = booking.customerName || 'Khách thể thao';
      let customerPhone = booking.customerPhone || 'N/A';

      if (booking.userId) {
        const member = await this.userModel.findById(booking.userId).exec();
        if (member) {
          if (member.fullName) customerName = member.fullName;
          if (member.phone) customerPhone = member.phone;
        }
      }

      const rentalsTotal =
        booking.equipmentRentals?.reduce((sum: number, r: any) => sum + r.price * r.quantity, 0) || 0;
      const courtPrice = Math.max(0, booking.totalPrice - (booking.vatAmount || 0) - rentalsTotal);

      const items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        unitPriceFormatted: string;
        totalPriceFormatted: string;
      }> = [
        {
          name: `${venue?.name || 'Sân thể thao'} (${booking.startTime} - ${booking.endTime})`,
          quantity: 1,
          unitPrice: courtPrice,
          totalPrice: courtPrice,
          unitPriceFormatted: `${courtPrice.toLocaleString('vi-VN')} đ`,
          totalPriceFormatted: `${courtPrice.toLocaleString('vi-VN')} đ`,
        },
      ];

      if (booking.equipmentRentals && booking.equipmentRentals.length > 0) {
        for (const eq of booking.equipmentRentals) {
          const eqTotal = eq.price * eq.quantity;
          items.push({
            name: eq.name,
            quantity: eq.quantity,
            unitPrice: eq.price,
            totalPrice: eqTotal,
            unitPriceFormatted: `${(eq.price || 0).toLocaleString('vi-VN')} đ`,
            totalPriceFormatted: `${eqTotal.toLocaleString('vi-VN')} đ`,
          });
        }
      }

      const vatAmount = booking.vatAmount || Math.round((booking.totalPrice * 8) / 108);
      const subtotal = Math.max(0, booking.totalPrice - vatAmount);

      return {
        type: 'BOOKING_INVOICE',
        storeInfo: {
          name: 'TỔ HỢP THỂ THAO VÀ GIẢI TRÍ PHANTA',
          branch: 'Chi nhánh Sân vận động Mỹ Đình',
          address: 'Số 1 Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
          hotline: '1900 8888',
          taxCode: '0317892341',
          wifi: 'Wifi: PhantaSports (Mật khẩu: phanta2026)',
          website: 'phantasports.vn',
        },
        title: 'HÓA ĐƠN ĐẶT SÂN VÀ DỊCH VỤ THỂ THAO',
        subTitle: 'Xác nhận dịch vụ sân bãi và dụng cụ thi đấu',
        invoiceNo: `#${booking.checkInCode || booking._id.toString().slice(-8).toUpperCase()}`,
        createdAt: booking.createdAt,
        createdAtFormatted: new Date(booking.createdAt).toLocaleString('vi-VN'),
        cashierName: 'Thu Ngân Quầy 01',
        customerName,
        customerPhone,
        items,
        subtotal,
        subtotalFormatted: `${subtotal.toLocaleString('vi-VN')} đ`,
        discountAmount: booking.discountAmount || 0,
        discountAmountFormatted: `${(booking.discountAmount || 0).toLocaleString('vi-VN')} đ`,
        vatRate: booking.vatRate || 8,
        vatAmount,
        vatAmountFormatted: `${vatAmount.toLocaleString('vi-VN')} đ`,
        finalTotal: booking.totalPrice,
        finalTotalFormatted: `${(booking.totalPrice || 0).toLocaleString('vi-VN')} đ`,
        paymentMethod: booking.paymentMethod || 'CASH',
        paymentMethodText:
          booking.paymentMethod === 'VIETQR'
            ? 'Chuyển khoản VietQR'
            : booking.paymentMethod === 'WALLET'
            ? 'Ví Phanta Pay'
            : 'Tiền mặt tại quầy',
        barcodeText: `*${booking.checkInCode || booking._id}*`,
        qrLookupCode: `PST-${(booking.checkInCode || booking._id.toString()).replace(/[^A-Za-z0-9]/g, '')}`,
        lookupUrl: 'tracuu.phantasports.vn',
        note: booking.note || 'Đặt sân thể thao thành công',
        thankYouNote: 'Cảm ơn Quý khách và Hẹn gặp lại!',
      };
    }

    throw new NotFoundException('Không tìm thấy thông tin đơn hàng hoặc hóa đơn để in');
  }

  /**
   * Chức năng In 2: Lấy dữ liệu phiếu vé cứng / thẻ thể thao có mã QR cổng xoay Turnstile (Khổ in nhiệt 80mm)
   */
  async getTicketPrintData(bookingId: string): Promise<any> {
    if (!bookingId) {
      throw new BadRequestException('Mã vé đặt sân không được để trống');
    }

    const cleanId = bookingId.replace(/^#/, '').trim();

    let booking: BookingDocument | null = null;
    if (Types.ObjectId.isValid(bookingId)) {
      booking = await this.bookingModel.findById(bookingId).exec();
    }
    if (!booking && Types.ObjectId.isValid(cleanId)) {
      booking = await this.bookingModel.findById(cleanId).exec();
    }
    if (!booking) {
      booking = await this.bookingModel.findOne({
        $or: [
          { checkInCode: bookingId },
          { checkInCode: cleanId },
          { checkInCode: '#' + cleanId },
        ],
      }).exec();
    }

    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin vé đặt sân để in phiếu');
    }

    const venue = await this.venueModel.findById(booking.venueId).exec();
    let customerName = booking.customerName || 'Khách thể thao';
    let customerPhone = booking.customerPhone || 'N/A';

    if (booking.userId) {
      const member = await this.userModel.findById(booking.userId).exec();
      if (member) {
        if (member.fullName) customerName = member.fullName;
        if (member.phone) customerPhone = member.phone;
      }
    }

    const bookingDateFormatted = booking.bookingDate
      ? new Date(booking.bookingDate).toLocaleDateString('vi-VN')
      : 'N/A';

    const checkInCode = booking.checkInCode || `PHANTA-BK${booking._id.toString().slice(-6).toUpperCase()}`;
    const qrData = booking.qrToken || `PHANTA-QR:${checkInCode}:${booking.venueId}`;

    const equipmentList = (booking.equipmentRentals || []).map((eq) => ({
      name: eq.name,
      quantity: eq.quantity,
      priceFormatted: `${(eq.price || 0).toLocaleString('vi-VN')} đ`,
    }));

    const statusText =
      booking.status === BookingStatus.CHECKED_IN
        ? 'ĐÃ VÀO SÂN (CHECK-IN THÀNH CÔNG)'
        : 'ĐÃ XÁC NHẬN (SẴN SÀNG VÀO SÂN)';

    const venueName = venue?.name || 'Sân thể thao Phanta';
    const courtCode = venue?.courtCode || 'Sân tiêu chuẩn';
    const sportCategory = venue?.sportCategory || 'Thể thao';

    return {
      type: 'ENTRY_TICKET',
      storeInfo: {
        name: 'TỔ HỢP THỂ THAO VÀ GIẢI TRÍ PHANTA',
        systemName: 'Cổng kiểm soát vé thông minh Turnstile',
        hotline: '1900 8888',
        address: 'Số 1 Lê Đức Thọ, Phường Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
      },
      ticketTitle: 'PHIẾU VÉ VÀO SÂN THỂ THAO',
      checkInCode,
      qrData,
      venue: {
        id: booking.venueId,
        name: venueName,
        courtCode: courtCode,
        sportCategory: sportCategory,
        line1: venueName,
        line2: `${sportCategory} - ${courtCode}`,
      },
      schedule: {
        bookingDate: bookingDateFormatted,
        timeSlot: `${booking.startTime} - ${booking.endTime}`,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      customer: {
        name: customerName,
        phone: customerPhone,
      },
      equipmentRentals: equipmentList,
      financials: {
        finalTotal: booking.totalPrice,
        finalTotalFormatted: `${(booking.totalPrice || 0).toLocaleString('vi-VN')} đ`,
        paymentMethod: booking.paymentMethod || 'CASH',
        paymentMethodText:
          booking.paymentMethod === 'VIETQR'
            ? 'Chuyển khoản VietQR'
            : booking.paymentMethod === 'WALLET'
            ? 'Ví Phanta Pay'
            : 'Tiền mặt tại quầy',
      },
      status: booking.status,
      statusText,
      instructions: [
        '1. Vui lòng xuất trình mã QR này trước đầu đọc cổng xoay Turnstile để mở cổng',
        '2. Có mặt trước 10 phút để nhận sân và dụng cụ thi đấu',
        '3. Giữ gìn vệ sinh chung và bảo quản tài sản tại cụm sân',
        '4. Liên hệ quầy thu ngân hoặc gọi hotline 1900 8888 khi cần hỗ trợ',
      ],
      thankYouNote: 'Chúc Quý khách có buổi thi đấu tràn đầy năng lượng!',
    };
  }
}
