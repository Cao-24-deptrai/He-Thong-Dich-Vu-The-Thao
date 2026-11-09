// @ts-nocheck — mẫu minh họa, tên service/collection cần điều chỉnh theo mã thực tế.
// MẪU THAM KHẢO. Mọi hàm chạy TRONG transaction do nơi gọi mở (truyền session).
// Bất biến: balance >= 0, held >= 0; sổ cái chỉ ghi thêm; idempotencyKey duy nhất.

// Danh mục được trả bằng ví lấy từ settings (wallet.allowedCategories): COURT, GAME_TIME, GAME_ROOM, CANTEEN, RENTAL

export class WalletServiceExample {
  async spend(p: SpendParams, session: ClientSession) {
    if (!Number.isSafeInteger(p.amount) || p.amount <= 0) throw new DomainError('AMOUNT_INVALID', 'Số tiền không hợp lệ', 422);
    if (!(await this.settings.walletAllowedCategories()).includes(p.category)) {
      throw new DomainError('WALLET_CATEGORY_NOT_ALLOWED', 'Ví không dùng được cho dịch vụ này', 422);
    }
    const dup = await this.ledger.findByKey(p.idempotencyKey, session);
    if (dup) return dup; // gửi lặp: trả kết quả cũ

    // Cập nhật CÓ ĐIỀU KIỆN, nguyên tử: không bao giờ âm.
    const w = await this.wallets.findOneAndUpdate(
      { userId: p.userId, balance: { $gte: p.amount } },
      { $inc: { balance: -p.amount, version: 1 } },
      { session, returnDocument: 'after' },
    );
    if (!w) throw new DomainError('WALLET_INSUFFICIENT', 'Số dư ví không đủ', 409);

    try {
      return await this.ledger.insert({
        walletId: w._id, type: 'SPEND', amount: -p.amount, heldDelta: 0,
        balanceAfter: w.balance, heldAfter: w.held, refType: p.refType, refId: p.refId, idempotencyKey: p.idempotencyKey,
      }, session);
    } catch (e) {
      // Hai yêu cầu cùng key chạy đồng thời: transaction của một bên sẽ thất bại và hoàn tác số dư.
      if (isDuplicateKeyError(e)) throw new DomainError('IDEMPOTENT_REPLAY', 'Yêu cầu đã được xử lý', 409);
      throw e;
    }
  }

  // Tạm giữ cho phiên gaming: balance → held.
  async hold(userId: string, amount: number, key: string, session: ClientSession) {
    const w = await this.wallets.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount, held: amount, version: 1 } },
      { session, returnDocument: 'after' },
    );
    if (!w) throw new DomainError('WALLET_INSUFFICIENT', 'Số dư ví không đủ', 409);
    await this.ledger.insert({ walletId: w._id, type: 'HOLD', amount: 0, heldDelta: amount, balanceAfter: w.balance, heldAfter: w.held, idempotencyKey: key }, session);
  }

  // Quyết toán: trừ phần đã dùng từ held, trả phần dư về balance.
  async settleHold(userId: string, held: number, cost: number, refId: string, key: string, session: ClientSession) {
    if (cost > held) throw new DomainError('SETTLE_EXCEEDS_HOLD', 'Chi phí vượt phần tạm giữ', 500);
    const w = await this.wallets.findOneAndUpdate(
      { userId, held: { $gte: held } },
      { $inc: { held: -held, balance: held - cost, version: 1 } },
      { session, returnDocument: 'after' },
    );
    if (!w) throw new DomainError('HOLD_NOT_FOUND', 'Không tìm thấy khoản tạm giữ', 409);
    await this.ledger.insert({ walletId: w._id, type: 'SPEND', amount: -cost, heldDelta: -held, balanceAfter: w.balance, heldAfter: w.held, refType: 'GAMING_SESSION', refId, idempotencyKey: key }, session);
  }
}
