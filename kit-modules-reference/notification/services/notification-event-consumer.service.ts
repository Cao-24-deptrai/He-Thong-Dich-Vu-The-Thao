import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { NotificationService } from './notification.service.js';
import { NotificationEventType, NotificationChannel } from '@sports/contracts';

@Injectable()
export class NotificationEventConsumerService {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Xử lý gửi mã OTP (ZNS + Email dự phòng)
   */
  async handleOtpSent(params: {
    userId: string;
    phone: string;
    otp: string;
    expiryMinutes: number;
  }) {
    const idempotencyKey = `notif_otp_${params.phone}_${crypto.randomBytes(4).toString('hex')}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.OTP_CODE,
      variables: {
        otp: params.otp,
        expiryMinutes: params.expiryMinutes,
      },
      idempotencyKey,
      forceChannels: [NotificationChannel.ZNS, NotificationChannel.EMAIL],
    });
  }

  /**
   * Xử lý đặt sân thành công
   */
  async handleBookingConfirmed(params: {
    userId: string;
    fullName: string;
    bookingCode: string;
    courtName: string;
    startTime: string;
    amount: number;
  }) {
    const idempotencyKey = `notif_bkg_confirm_${params.bookingCode}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.BOOKING_CONFIRMED,
      variables: {
        fullName: params.fullName,
        bookingCode: params.bookingCode,
        courtName: params.courtName,
        startTime: params.startTime,
        amount: params.amount,
      },
      idempotencyKey,
      extraData: { bookingCode: params.bookingCode },
    });
  }

  /**
   * Xử lý giữ chỗ sân thành công
   */
  async handleBookingHeld(params: {
    userId: string;
    fullName: string;
    bookingCode: string;
    courtName: string;
    startTime: string;
    holdExpiresAt: string;
  }) {
    const idempotencyKey = `notif_bkg_held_${params.bookingCode}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.BOOKING_HELD,
      variables: {
        fullName: params.fullName,
        courtName: params.courtName,
        startTime: params.startTime,
        holdExpiresAt: params.holdExpiresAt,
      },
      idempotencyKey,
    });
  }

  /**
   * Xử lý hủy sân & hoàn tiền cọc
   */
  async handleBookingCancelled(params: {
    userId: string;
    fullName: string;
    bookingCode: string;
    refundAmount: number;
  }) {
    const idempotencyKey = `notif_bkg_cancel_${params.bookingCode}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.BOOKING_CANCELLED,
      variables: {
        fullName: params.fullName,
        bookingCode: params.bookingCode,
        refundAmount: params.refundAmount,
      },
      idempotencyKey,
    });
  }

  /**
   * Xử lý phát hành hóa đơn điện tử
   */
  async handleInvoiceIssued(params: {
    userId: string;
    fullName: string;
    invoiceCode: string;
    invoiceNumber: string;
    lookupCode: string;
    pdfUrl: string;
  }) {
    const idempotencyKey = `notif_inv_issued_${params.invoiceCode}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.INVOICE_ISSUED,
      variables: {
        fullName: params.fullName,
        invoiceNumber: params.invoiceNumber,
        lookupCode: params.lookupCode,
        pdfUrl: params.pdfUrl,
      },
      idempotencyKey,
      extraData: { pdfUrl: params.pdfUrl },
    });
  }

  /**
   * Xử lý thanh toán lệch tiền hoặc thanh toán muộn hoàn về ví
   */
  async handlePaymentMismatch(params: {
    userId: string;
    fullName: string;
    paymentCode: string;
    receivedAmount: number;
    reason: string;
  }) {
    const idempotencyKey = `notif_pay_mismatch_${params.paymentCode}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.PAYMENT_MISMATCH,
      variables: {
        fullName: params.fullName,
        paymentCode: params.paymentCode,
        receivedAmount: params.receivedAmount,
        reason: params.reason,
      },
      idempotencyKey,
    });
  }

  /**
   * Xử lý nạp ví thành công
   */
  async handleWalletTopup(params: {
    userId: string;
    fullName: string;
    amount: number;
    newBalance: number;
  }) {
    const idempotencyKey = `notif_wallet_topup_${params.userId}_${Date.now()}`;
    return this.notificationService.send({
      userId: params.userId,
      eventCode: NotificationEventType.WALLET_TOPUP,
      variables: {
        fullName: params.fullName,
        amount: params.amount,
        newBalance: params.newBalance,
      },
      idempotencyKey,
    });
  }
}
