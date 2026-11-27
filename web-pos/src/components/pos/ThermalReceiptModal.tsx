'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Printer, X } from 'lucide-react';

export interface ReceiptLineItem {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptPayload {
  key?: string;
  title: string;
  invoiceNo: string;
  customer: string;
  cashier?: string;
  time?: string;
  method: string;
  items: ReceiptLineItem[];
  subtotal: number;
  discount?: number;
  total: number;
  tendered?: number;
  change?: number;
  extraNote?: string;
  lookupCode?: string;
}

const DEFAULT_TEMPLATES: Record<string, ReceiptPayload> = {
  walkin: {
    key: 'walkin',
    title: 'PHIẾU XÁC NHẬN ĐẶT SÂN VÀ VÀO SÂN',
    invoiceNo: '#SAN-8821',
    customer: 'Nguyễn Văn Hùng (0903.112.334)',
    method: 'Tiền mặt tại quầy',
    items: [
      { name: 'Sân bóng đá mini F1 (18:00 - 19:30)', qty: 1, price: 325000 },
      { name: 'Nước khoáng Revive Chanh Muối 500ml', qty: 2, price: 15000 },
    ],
    subtotal: 355000,
    discount: 0,
    total: 355000,
    tendered: 400000,
    change: 45000,
    extraNote: 'Vào cổng: Quét QR Quầy 01 - Mã sân: SAN-F1 - Đã thanh toán đủ',
    lookupCode: 'PST-SAN8821',
  },
  canteen: {
    key: 'canteen',
    title: 'HÓA ĐƠN CANTEEN BÁN LẺ',
    invoiceNo: '#CAN-3849',
    customer: 'Khách vãng lai (Quầy Canteen)',
    method: 'Chuyển khoản VietQR',
    items: [
      { name: 'Mì trộn xúc xích trứng', qty: 1, price: 35000 },
      { name: 'Nước khoáng Pocari Sweat 500ml', qty: 2, price: 15000 },
    ],
    subtotal: 65000,
    discount: 0,
    total: 65000,
    tendered: 65000,
    change: 0,
    extraNote: 'Quầy Canteen - Thanh toán trực tiếp tại quầy',
    lookupCode: 'PST-CAN3849',
  },
  gym: {
    key: 'gym',
    title: 'PHIẾU XÁC NHẬN HỘI VIÊN GYM',
    invoiceNo: '#GYM-9918',
    customer: 'Lê Hoàng Long (0908.889.911)',
    method: 'Tiền mặt tại quầy',
    items: [{ name: 'Gói hội viên Gym 1 tháng', qty: 1, price: 650000 }],
    subtotal: 650000,
    discount: 0,
    total: 650000,
    tendered: 650000,
    change: 0,
    extraNote: 'Lối vào: Cửa xoay khu Gym - Kiểm tra thẻ bằng QR',
    lookupCode: 'PST-GYM9918',
  },
  gaming: {
    key: 'gaming',
    title: 'PHIẾU NẠP GIỜ CYBER GAMING',
    invoiceNo: '#CYB-7252',
    customer: 'Võ Minh Quân (Máy PC-46)',
    method: 'Tiền mặt tại quầy',
    items: [{ name: 'Giờ chơi máy PC-46 (5 giờ - 10.000đ/h)', qty: 1, price: 50000 }],
    subtotal: 50000,
    discount: 0,
    total: 50000,
    tendered: 50000,
    change: 0,
    extraNote: 'Khu sảnh chính - Trả máy sớm được hoàn tiền phần chưa dùng',
    lookupCode: 'PST-CYB7252',
  },
  refund: {
    key: 'refund',
    title: 'PHIẾU XÁC NHẬN HOÀN TIỀN',
    invoiceNo: '#REF-4012',
    customer: 'Trần Quốc Bảo (0982.556.778)',
    method: 'Hoàn chuyển khoản',
    items: [{ name: 'Hoàn tiền đơn đặt sân #BK-4012', qty: 1, price: 250000 }],
    subtotal: 250000,
    discount: 0,
    total: 250000,
    tendered: 250000,
    change: 0,
    extraNote: 'Đã đối soát giao dịch và hoàn trả theo quy định',
    lookupCode: 'PST-REF4012',
  },
  shift: {
    key: 'shift',
    title: 'BIÊN BẢN BÀN GIAO VÀ ĐỐI SOÁT CA',
    invoiceNo: '#CA-102',
    customer: 'Thu ngân bàn giao - Quản lý cơ sở',
    method: 'Kiểm đếm 9 mệnh giá tiền mặt',
    items: [
      { name: 'Quỹ tiền mặt đầu ca', qty: 1, price: 2000000 },
      { name: 'Doanh thu tiền mặt trong ca', qty: 1, price: 3840000 },
      { name: 'Hoàn tiền mặt tại quầy', qty: 1, price: -250000 },
    ],
    subtotal: 5590000,
    discount: 0,
    total: 5590000,
    tendered: 5590000,
    change: 0,
    extraNote: 'Két lý thuyết: 5.590.000đ - Thực tế kiểm đếm: 5.590.000đ',
    lookupCode: 'PST-CA102',
  },
};

interface ReceiptContextValue {
  openReceipt: (payload?: ReceiptPayload) => void;
  closeReceipt: () => void;
}

const ReceiptContext = createContext<ReceiptContextValue>({
  openReceipt: () => {},
  closeReceipt: () => {},
});

export function useThermalReceipt() {
  return useContext(ReceiptContext);
}

export function ThermalReceiptProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string>('walkin');
  const [receipt, setReceipt] = useState<ReceiptPayload>(DEFAULT_TEMPLATES.walkin);

  const openReceipt = useCallback((payload?: ReceiptPayload) => {
    if (payload) {
      setReceipt(payload);
      setActiveKey(payload.key || 'custom');
    } else {
      setReceipt((prev) => prev || DEFAULT_TEMPLATES.walkin);
    }
    setIsOpen(true);
  }, []);

  const closeReceipt = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        openReceipt();
      } else if (e.key === 'Escape' && isOpen) {
        closeReceipt();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, openReceipt, closeReceipt]);

  const nowStr = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  })();

  const formatMoney = (val: number) => {
    if (val < 0) return `-${Math.abs(val).toLocaleString('vi-VN')} đ`;
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  return (
    <ReceiptContext.Provider value={{ openReceipt, closeReceipt }}>
      {children}

      {isOpen && (
        <div
          id="modal-thermal-receipt"
          role="dialog"
          aria-modal="true"
          aria-labelledby="thermal-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReceipt();
          }}
        >
          <div className="w-full max-w-lg flex flex-col items-center my-auto py-4">
            {/* Template Switcher (hidden on print) */}
            <div className="w-full max-w-md mb-3 p-3 rounded-2xl bg-[var(--pos-bg-card)] border border-[var(--pos-border)] shadow-xl no-print">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[var(--pos-border-subtle)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--pos-text-heading)]">
                  <Printer className="w-4 h-4 text-[var(--pos-accent)] shrink-0" />
                  <span id="thermal-modal-title" className="font-barlow uppercase tracking-wide text-sm">
                    Mẫu in nhiệt 80mm ESC/POS
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeReceipt}
                  aria-label="Đóng cửa sổ in hóa đơn"
                  className="p-1 rounded-lg text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)] hover:bg-[var(--pos-bg-card-inner)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { key: 'walkin', label: 'Đặt sân' },
                  { key: 'canteen', label: 'Canteen' },
                  { key: 'gym', label: 'Gym' },
                  { key: 'gaming', label: 'Gaming' },
                  { key: 'refund', label: 'Hoàn tiền' },
                  { key: 'shift', label: 'Chốt ca' },
                ].map((tpl) => {
                  const selected = activeKey === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => {
                        setActiveKey(tpl.key);
                        setReceipt(DEFAULT_TEMPLATES[tpl.key]);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)] ${
                        selected
                          ? 'bg-[var(--pos-accent)] text-[var(--pos-accent-fg)] font-bold'
                          : 'bg-[var(--pos-bg-card-inner)] text-[var(--pos-text-sub)] hover:text-[var(--pos-text-heading)] border border-[var(--pos-border-subtle)]'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 80mm Paper */}
            <div
              id="thermal-receipt-paper"
              className="w-full max-w-[340px] thermal-paper p-5 sm:p-6 text-black font-tabular text-xs space-y-3 my-2"
            >
              <div className="text-center space-y-1">
                <div className="font-barlow font-extrabold text-base tracking-wider text-black">
                  PHANTA SPORTS COMPLEX
                </div>
                <div className="text-[10px] leading-tight text-gray-700">
                  128 Nguyễn Hữu Thọ, Quận 7, TP.HCM
                </div>
                <div className="text-[10px] text-gray-700">
                  Hotline: 1900 8888 - MST: 0317892341
                </div>
                <div className="border-b border-dashed border-gray-400 my-2" />
                <div className="font-barlow font-extrabold text-xs uppercase tracking-tight text-black">
                  {receipt.title}
                </div>
                <div className="text-[10px] font-bold text-gray-800">
                  Số chứng từ: {receipt.invoiceNo}
                </div>
                <div className="text-[10px] text-gray-600">
                  Thời gian: {receipt.time || nowStr}
                </div>
                <div className="text-[10px] text-gray-700">
                  Thu ngân: {receipt.cashier || 'Quầy thu ngân 01'}
                </div>
                <div className="text-[10px] font-semibold text-gray-900">
                  Khách hàng: {receipt.customer}
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-1" />

              <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase pb-0.5">
                <span>Nội dung dịch vụ</span>
                <span className="text-right">Thành tiền</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                {receipt.items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex justify-between items-start">
                    <div className="flex-1 mr-2 leading-tight">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-[10px] text-gray-600">
                        {formatMoney(item.price)} x {item.qty}
                      </div>
                    </div>
                    <div className="font-bold text-right text-gray-900 font-tabular">
                      {formatMoney(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {receipt.extraNote && (
                <div className="p-2 bg-gray-100 rounded text-[10px] text-gray-800 leading-tight border border-gray-200">
                  {receipt.extraNote}
                </div>
              )}

              <div className="border-b border-dashed border-gray-400 my-1" />

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="font-bold">{formatMoney(receipt.subtotal)}</span>
                </div>
                {receipt.discount && receipt.discount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giảm giá:</span>
                    <span className="font-bold text-rose-700">-{formatMoney(receipt.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-gray-400 text-black">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="font-barlow font-extrabold text-base">{formatMoney(receipt.total)}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-gray-600">Hình thức:</span>
                  <span className="font-semibold">{receipt.method}</span>
                </div>
                {typeof receipt.tendered === 'number' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tiền khách đưa:</span>
                    <span className="font-bold">{formatMoney(receipt.tendered)}</span>
                  </div>
                )}
                {typeof receipt.change === 'number' && (
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-600">Tiền thối lại:</span>
                    <span className="font-extrabold">{formatMoney(receipt.change)}</span>
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-gray-400 my-2" />

              <div className="text-center space-y-2">
                <div className="text-[10px] font-bold text-gray-800">
                  Cảm ơn Quý khách - Hẹn gặp lại
                </div>
                <div className="text-[9px] text-gray-600">
                  Wifi: phanta2026 - Website: phantasports.vn
                </div>
                <div className="flex flex-col items-center justify-center py-1">
                  <svg className="h-8 w-48 text-black" viewBox="0 0 200 36" fill="currentColor" aria-hidden="true">
                    <rect x="0" y="0" width="3" height="36" />
                    <rect x="5" y="0" width="2" height="36" />
                    <rect x="9" y="0" width="4" height="36" />
                    <rect x="16" y="0" width="2" height="36" />
                    <rect x="20" y="0" width="5" height="36" />
                    <rect x="28" y="0" width="2" height="36" />
                    <rect x="32" y="0" width="3" height="36" />
                    <rect x="38" y="0" width="6" height="36" />
                    <rect x="46" y="0" width="2" height="36" />
                    <rect x="50" y="0" width="4" height="36" />
                    <rect x="56" y="0" width="2" height="36" />
                    <rect x="61" y="0" width="5" height="36" />
                    <rect x="68" y="0" width="3" height="36" />
                    <rect x="73" y="0" width="2" height="36" />
                    <rect x="77" y="0" width="5" height="36" />
                    <rect x="85" y="0" width="2" height="36" />
                    <rect x="90" y="0" width="3" height="36" />
                    <rect x="95" y="0" width="6" height="36" />
                    <rect x="103" y="0" width="2" height="36" />
                    <rect x="108" y="0" width="4" height="36" />
                    <rect x="114" y="0" width="3" height="36" />
                    <rect x="119" y="0" width="5" height="36" />
                    <rect x="126" y="0" width="2" height="36" />
                    <rect x="131" y="0" width="4" height="36" />
                    <rect x="137" y="0" width="2" height="36" />
                    <rect x="141" y="0" width="5" height="36" />
                    <rect x="148" y="0" width="3" height="36" />
                    <rect x="153" y="0" width="2" height="36" />
                    <rect x="157" y="0" width="6" height="36" />
                    <rect x="165" y="0" width="2" height="36" />
                    <rect x="169" y="0" width="4" height="36" />
                    <rect x="175" y="0" width="3" height="36" />
                    <rect x="180" y="0" width="5" height="36" />
                    <rect x="187" y="0" width="2" height="36" />
                    <rect x="191" y="0" width="4" height="36" />
                    <rect x="197" y="0" width="3" height="36" />
                  </svg>
                  <div className="text-[9px] text-gray-800 tracking-wider font-bold mt-0.5">
                    *PHANTA-{receipt.invoiceNo.replace('#', '')}*
                  </div>
                </div>
                <div className="text-[9px] text-gray-600 pt-1 border-t border-dashed border-gray-300">
                  Tra cứu hóa đơn: tracuu.phantasports.vn - Mã: {receipt.lookupCode || 'PST-2026'}
                </div>
              </div>
            </div>

            <div className="w-full max-w-[340px] mt-3 flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="phanta-btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>In hóa đơn (Ctrl+P)</span>
              </button>
              <button
                type="button"
                onClick={closeReceipt}
                className="phanta-btn-secondary px-4 py-2.5 text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-accent)]"
              >
                Đóng (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </ReceiptContext.Provider>
  );
}
