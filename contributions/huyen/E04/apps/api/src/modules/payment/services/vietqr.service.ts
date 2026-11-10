import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../facility/services/settings.service.js';

export interface VietQrData {
  qrCodeText: string;
  qrDataUrl: string;
}

@Injectable()
export class VietQrService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Tạo mã VietQR chuẩn cho đơn thanh toán
   * @param paymentCode Mã thanh toán duy nhất dạng PAY-YYYYMMDD-XXXXXX
   * @param amount Số tiền thanh toán (Integer VND)
   */
  generateVietQr(paymentCode: string, amount: number): VietQrData {
    const bankBin = this.settingsService.get<string>('vietqr.bankBin', '970422'); // Mặc định MBBank
    const accountNo = this.settingsService.get<string>('vietqr.accountNo', '0868888999');
    const accountName = this.settingsService.get<string>('vietqr.accountName', 'TO HOP THE THAO ANTIGRAVITY');

    const sanitizedCode = paymentCode.replace(/[^A-Za-z0-9]/g, '');
    const transferMessage = `PAY ${sanitizedCode}`;

    // Chuỗi text theo cấu trúc VietQR
    const qrCodeText = `vietqr://${bankBin}/${accountNo}?amount=${amount}&message=${encodeURIComponent(transferMessage)}&accountName=${encodeURIComponent(accountName)}`;

    // URL ảnh QR chuẩn VietQR Napas
    const encodedInfo = encodeURIComponent(transferMessage);
    const encodedAccountName = encodeURIComponent(accountName);
    const qrDataUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedInfo}&accountName=${encodedAccountName}`;

    return {
      qrCodeText,
      qrDataUrl,
    };
  }
}
