// @ts-nocheck — mẫu minh họa, tên service/collection cần điều chỉnh theo mã thực tế.
// MẪU THAM KHẢO cho hold → confirm → cancel. Điều chỉnh tên service/collection theo mã thực tế.
// Bất biến: Redis chỉ tăng tốc; MongoDB (unique index slots) là chốt chặn cuối.

export class BookingServiceExample {
  async hold(input: HoldInput, userId: string): Promise<BookingView> {
    const range = toSlotRange(input.startAt, input.endAt, cfg.slotMinutes, cfg.minDurationMinutes);
    const unitIds = await this.facility.resolveBaseUnitIds(input.resourceId); // sân ghép → nhiều đơn vị cơ sở
    const bookingId = new Types.ObjectId();
    const token = bookingId.toString();
    const keys = unitIds.flatMap((u) => range.indexes.map((i) => `lock:slot:${u}:${range.date}:${i}`));

    // Lớp 1: khóa Redis nguyên tử tất cả hoặc không gì.
    const locked = await this.redis.acquireLocks(keys, token, cfg.holdSeconds);
    if (!locked) throw new DomainError('SLOT_TAKEN', 'Khung giờ này vừa có người chọn', 409);

    try {
      const quote = await this.pricing.quote(input.resourceId, input.startAt, input.endAt, userId); // giá theo từng ô + snapshot
      const holdExpiresAt = new Date(Date.now() + cfg.holdSeconds * 1000);

      return await this.connection.transaction(async (session) => {
        // Dọn ô HELD đã hết hạn trong phạm vi (tránh E11000 giả do ô "ma").
        await this.slots.deleteExpiredHolds(unitIds, range.date, range.indexes, new Date(), session);

        // Lớp 3: unique (unitId, date, slotIndex). Trùng → SLOT_TAKEN.
        try {
          await this.slots.insertMany(
            unitIds.flatMap((unitId) => range.indexes.map((slotIndex) => ({
              unitId, date: range.date, slotIndex, bookingId, status: 'HELD', holdExpiresAt,
            }))),
            session,
          );
        } catch (e) {
          if (isDuplicateKeyError(e)) throw new DomainError('SLOT_TAKEN', 'Khung giờ không còn trống', 409);
          throw e;
        }

        const order = await this.orders.createForBooking({ userId, quote, bookingId }, session);
        return this.bookings.create({
          _id: bookingId, userId, resourceId: input.resourceId, startAt: input.startAt, endAt: input.endAt,
          status: 'PENDING_PAYMENT', totalAmount: quote.total, priceSnapshot: quote.snapshot,
          policySnapshot: { cancelRefundCutoffHours: cfg.cancelRefundCutoffHours }, orderId: order._id, version: 0,
        }, session);
      });
    } catch (e) {
      await this.redis.releaseLocks(keys, token); // lỗi → nhả khóa ngay
      throw e;
    }
  }

  // Xác nhận khi thanh toán thành công (gọi từ luồng webhook, trong transaction).
  async confirmPaid(bookingId: string, paymentId: string, session: ClientSession) {
    const booking = await this.bookings.findById(bookingId, session);
    if (booking.status === 'PENDING_PAYMENT') {
      const slotsLeft = await this.slots.countHeldBy(bookingId, session);
      if (slotsLeft === booking.expectedSlotCount) {
        await this.slots.confirmAll(bookingId, session);            // HELD → CONFIRMED, bỏ holdExpiresAt
        await this.bookings.transition(bookingId, 'PENDING_PAYMENT', 'CONFIRMED', session);
        await this.outbox.add('booking.booking.confirmed', { bookingId }, session);
        return;
      }
    }
    // Giữ chỗ đã hết hạn / ô đã mất: THANH TOÁN MUỘN → hoàn vào ví, không bao giờ nuốt tiền.
    await this.wallet.refundToWallet({ userId: booking.userId, amount: booking.totalAmount, reason: 'LATE_PAYMENT', refId: paymentId }, session);
    await this.outbox.add('booking.payment.refunded_late', { bookingId, paymentId }, session);
  }

}

// Hủy: hoàn theo SNAPSHOT chính sách của lượt đặt (không đọc lại cấu hình hiện tại).
function refundAmount(b: Booking, now: Date): number {
  const cutoffMs = b.policySnapshot.cancelRefundCutoffHours * 3600_000;
  return now.getTime() <= b.startAt.getTime() - cutoffMs ? b.amountPaid : 0;
}
