import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { Venue, VenueDocument } from '../venues/schemas/venue.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface BookingInvoiceEmailData {
  toEmail: string;
  customerName: string;
  checkInCode: string;
  venueName: string;
  courtCode?: string;
  bookingDate: string;
  timeSlot: string;
  courtPrice: number;
  rentalsTotal?: number;
  discountAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  finalTotal: number;
  paymentMethod: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isSandbox = true;

  constructor(
    private configService: ConfigService,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Venue.name) private venueModel: Model<VenueDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.isSandbox = false;
        this.logger.log(`📧 Đã kết nối dịch vụ SMTP Email tại ${host}:${port}`);
      } catch (err: any) {
        this.logger.warn(`Không thể khởi tạo SMTP: ${err.message}. Chuyển sang chế độ Sandbox.`);
        this.isSandbox = true;
      }
    } else {
      this.logger.log('ℹ️ SMTP chưa được cấu hình. Hệ thống đang chạy chế độ Sandbox Mock Mail Service.');
      this.isSandbox = true;
    }
  }

  /**
   * Gửi email xác nhận đặt sân và hóa đơn điện tử VAT
   */
  async sendBookingInvoiceEmail(data: BookingInvoiceEmailData): Promise<{ success: boolean; messageId: string }> {
    const formattedTotal = (data.finalTotal || 0).toLocaleString('vi-VN');
    const formattedCourtPrice = (data.courtPrice || 0).toLocaleString('vi-VN');
    const formattedVat = (data.vatAmount || 0).toLocaleString('vi-VN');
    const formattedRentals = (data.rentalsTotal || 0).toLocaleString('vi-VN');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0E14; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #121824; border-radius: 16px; border: 1px solid #1E293B; overflow: hidden; }
          .header { background: linear-gradient(135deg, #FF8400 0%, #D96B00 100%); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF; }
          .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; color: #FFFFFF; }
          .content { padding: 24px; }
          .ticket-card { background-color: #1A2234; border: 1px solid #2D3748; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
          .ticket-code { font-size: 26px; font-weight: 900; color: #10B981; letter-spacing: 2px; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1E293B; font-size: 13px; }
          .info-label { color: #94A3B8; }
          .info-value { font-weight: 600; color: #F8FAFC; }
          .total-row { display: flex; justify-content: space-between; padding: 16px 0 8px; font-size: 16px; font-weight: 800; color: #FF8400; border-top: 2px solid #FF8400; }
          .policies { background-color: #0F172A; border-radius: 8px; padding: 16px; font-size: 12px; color: #94A3B8; line-height: 1.6; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; font-size: 11px; color: #64748B; border-top: 1px solid #1E293B; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PHANTA SPORTS</h1>
            <p>XÁC NHẬN ĐẶT SÂN VÀ HÓA ĐƠN ĐIỆN TỬ</p>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.customerName}</strong>,</p>
            <p style="color: #94A3B8; font-size: 13px; line-height: 1.5;">Đơn đặt sân thể thao của bạn tại Phanta Sports đã được thanh toán và xác nhận thành công. Vui lòng xuất trình mã vé này tại cổng xoay Turnstile để vào sân.</p>

            <div class="ticket-card">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700;">Mã Vé Vào Sân</div>
              <div class="ticket-code">${data.checkInCode}</div>
              <div style="font-size: 15px; font-weight: 700; color: #CBD5E1;">${data.venueName}</div>
              <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">${data.courtCode || 'Sân tiêu chuẩn'}</div>
            </div>

            <div style="margin-bottom: 20px;">
              <div class="info-row"><span class="info-label">Ngày thi đấu</span><span class="info-value">${data.bookingDate}</span></div>
              <div class="info-row"><span class="info-label">Khung giờ</span><span class="info-value">${data.timeSlot}</span></div>
              <div class="info-row"><span class="info-label">Tiền sân</span><span class="info-value">${formattedCourtPrice} đ</span></div>
              ${data.rentalsTotal ? `<div class="info-row"><span class="info-label">Dụng cụ thuê</span><span class="info-value">${formattedRentals} đ</span></div>` : ''}
              <div class="info-row"><span class="info-label">Thuế GTGT (VAT 8%)</span><span class="info-value">${formattedVat} đ</span></div>
              <div class="info-row"><span class="info-label">Phương thức thanh toán</span><span class="info-value">${data.paymentMethod}</span></div>
              <div class="total-row"><span>TỔNG THANH TOÁN</span><span>${formattedTotal} đ</span></div>
            </div>

            <div class="policies">
              <div style="color: #CBD5E1; font-weight: 700; margin-bottom: 6px;">Chính Sách Hủy Và Đổi Lịch:</div>
              <div style="margin-bottom: 4px;">- Miễn phí đổi lịch thi đấu một lần nếu thông báo trước 12 giờ</div>
              <div style="margin-bottom: 4px;">- Hủy đơn hoàn tiền toàn bộ về Ví Phanta nếu hủy trước 12 giờ</div>
              <div>- Vui lòng có mặt trước giờ thi đấu 10 phút để nhận sân</div>
            </div>
          </div>
          <div class="footer">
            <div style="font-weight: 600; color: #94A3B8; font-size: 12px;">Tổ Hợp Thể Thao Và Giải Trí Phanta Olympic</div>
            <div style="font-size: 11px; color: #64748B;">Số 1 Lê Đức Thọ, Nam Từ Liêm, Hà Nội</div>
            <div style="margin-top: 4px; font-size: 11px; color: #64748B;">Hotline hỗ trợ 24/7: 1900 8888 | Email: support@phanta.vn</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    if (!this.isSandbox && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: '"Phanta Sports" <noreply@phanta.vn>',
          to: data.toEmail,
          subject: `[Phanta Sports] Xác nhận đặt sân thành công - Mã vé: ${data.checkInCode}`,
          html: htmlContent,
        });
        this.logger.log(`📧 Đã gửi email hóa đơn thành công tới ${data.toEmail} (ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        this.logger.error(`Lỗi gửi email thực: ${err.message}. Fallback sang Sandbox.`);
      }
    }

    this.logger.log(`📧 [Sandbox Mode] Hóa đơn điện tử đã chuẩn bị gửi tới ${data.toEmail} (Mã vé: ${data.checkInCode}, Tổng tiền: ${formattedTotal}đ)`);
    return { success: true, messageId };
  }

  /**
   * Tra cứu đơn đặt sân theo bookingId và gửi hóa đơn điện tử
   */
  async sendBookingInvoiceByBookingId(
    bookingId: string,
    customEmail?: string,
  ): Promise<{ success: boolean; messageId: string; email: string }> {
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
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt sân');
    }

    const venue = await this.venueModel.findById(booking.venueId).exec();
    let customerName = booking.customerName || 'Quý khách hàng';
    let targetEmail = customEmail;

    if (booking.userId) {
      const user = await this.userModel.findById(booking.userId).exec();
      if (user) {
        if (user.fullName) customerName = user.fullName;
        if (!targetEmail && user.email) targetEmail = user.email;
      }
    }

    if (!targetEmail) {
      throw new BadRequestException('Không tìm thấy địa chỉ email nhận hóa đơn');
    }

    const dateStr = booking.bookingDate ? new Date(booking.bookingDate).toISOString().split('T')[0] : 'N/A';
    const rentalsTotal = booking.equipmentRentals?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;

    const res = await this.sendBookingInvoiceEmail({
      toEmail: targetEmail,
      customerName,
      checkInCode: booking.checkInCode || `BK-${booking._id.toString().substring(18).toUpperCase()}`,
      venueName: venue?.name || 'Sân thể thao Phanta',
      courtCode: venue?.courtCode || 'Sân tiêu chuẩn',
      bookingDate: dateStr,
      timeSlot: `${booking.startTime} - ${booking.endTime}`,
      courtPrice: booking.totalPrice - rentalsTotal,
      rentalsTotal,
      discountAmount: booking.discountAmount || 0,
      vatRate: booking.vatRate || 8,
      vatAmount: booking.vatAmount || Math.round((booking.totalPrice * 8) / 108),
      finalTotal: booking.totalPrice,
      paymentMethod: booking.paymentMethod || 'Tiền mặt tại quầy / Chuyển khoản',
    });

    return {
      success: true,
      messageId: res.messageId,
      email: targetEmail,
    };
  }
}
