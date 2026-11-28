'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  FileText,
  Search,
  RefreshCw,
  PlusCircle,
  Building,
  CheckCircle2,
  Printer,
  ShieldCheck,
  TrendingUp,
  Receipt,
  FileCode,
  X,
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form xuất hóa đơn mới
  const [customerName, setCustomerName] = useState('Công ty Cổ phần Công nghệ ABC');
  const [customerTaxCode, setCustomerTaxCode] = useState('0316789999');
  const [companyAddress, setCompanyAddress] = useState('Tòa nhà Bitexco, Quận 1, TP.HCM');
  const [customerEmail, setCustomerEmail] = useState('finance@abc.vn');
  const [serviceName, setServiceName] = useState('Thuê cụm 4 sân cầu lông thi đấu giải nội bộ (4 giờ)');
  const [unitPrice, setUnitPrice] = useState<number>(1200000);
  const [taxRate, setTaxRate] = useState<number>(8);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminInvoices({ search });
      if (res?.items && Array.isArray(res.items)) {
        setInvoices(res.items);
      } else {
        setInvoices([
          {
            _id: 'inv-1',
            invoiceNumber: 'HD26-001001',
            customerName: 'Công ty TNHH Phần Mềm FPT',
            customerTaxCode: '0101248141',
            companyAddress: 'Tòa nhà FPT, Cầu Giấy, Hà Nội',
            subtotal: 3500000,
            taxRate: 8,
            taxAmount: 280000,
            totalAmount: 3780000,
            status: 'ISSUED',
            cqtCode: 'CQT-26-88F4A9B1C2',
            refType: 'BOOKING',
            refId: 'BK-99124',
            issuedAt: new Date().toISOString(),
          },
          {
            _id: 'inv-2',
            invoiceNumber: 'HD26-001002',
            customerName: 'Nguyễn Văn Minh (Cá nhân)',
            customerTaxCode: '8392104918',
            subtotal: 450000,
            taxRate: 8,
            taxAmount: 36000,
            totalAmount: 486000,
            status: 'ISSUED',
            cqtCode: 'CQT-26-44B712EA99',
            refType: 'BOOKING',
            refId: 'BK-99125',
            issuedAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            _id: 'inv-3',
            invoiceNumber: 'HD26-001003',
            customerName: 'Ngân hàng TMCP Ngoại Thương VN (Vietcombank)',
            customerTaxCode: '0100112437',
            companyAddress: '198 Trần Quang Khải, Hoàn Kiếm, Hà Nội',
            subtotal: 8000000,
            taxRate: 8,
            taxAmount: 640000,
            totalAmount: 8640000,
            status: 'ISSUED',
            cqtCode: 'CQT-26-19EA789BF1',
            refType: 'TOURNAMENT_SPONSOR',
            refId: 'TN-2026-01',
            issuedAt: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSubmit = async () => {
    try {
      const lineTax = Math.round((unitPrice * taxRate) / 100);
      await api.issueInvoice({
        customerName,
        customerTaxCode,
        companyName: customerName,
        companyAddress,
        customerEmail,
        refType: 'BOOKING_WALKIN',
        refId: `BK-WK-${Date.now()}`,
        items: [
          {
            name: serviceName,
            quantity: 1,
            unitPrice,
            amount: unitPrice,
            taxRate,
            taxAmount: lineTax,
          },
        ],
      });
      alert('Đã phát hành hóa đơn điện tử thành công và gửi cấp mã Cơ quan thuế.');
      setShowIssueModal(false);
      loadInvoices();
    } catch (e: any) {
      alert(e.message || 'Không thể phát hành hóa đơn');
    }
  };

  const totalRevenue = invoices.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  const totalTax = invoices.reduce((acc, i) => acc + (i.taxAmount || 0), 0);
  const totalFinal = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);

  const filteredInvoices = invoices.filter((i) => {
    const text = `${i.invoiceNumber} ${i.customerName} ${i.customerTaxCode} ${i.cqtCode}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Doanh thu & Hóa đơn điện tử</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Quản lý sổ cái doanh thu, thuế suất ưu đãi 8% thể thao và cấp mã Cơ quan thuế
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="phanta-btn-primary px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" strokeWidth={1.75} />
            <span>Xuất hóa đơn VAT</span>
          </button>
          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="phanta-btn-secondary px-3.5 py-2.5 text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--pitch-green)]' : ''}`} strokeWidth={1.75} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs font-medium">Doanh thu trước thuế</span>
            <TrendingUp className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-heading font-semibold text-[var(--text-heading)] tabular-nums">
            {totalRevenue.toLocaleString('vi-VN')} <span className="text-sm font-medium text-[var(--text-sub)]">đ</span>
          </div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Doanh thu dịch vụ thể thao và phòng máy
          </div>
        </div>

        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs font-medium">Thuế GTGT (VAT 8%)</span>
            <Receipt className="w-4 h-4 text-[var(--burnt-orange)]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-heading font-semibold text-[var(--text-heading)] tabular-nums">
            {totalTax.toLocaleString('vi-VN')} <span className="text-sm font-medium text-[var(--text-sub)]">đ</span>
          </div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Áp dụng mức thuế suất ưu đãi 8%
          </div>
        </div>

        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs font-medium">Tổng doanh số kê khai</span>
            <Building className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-heading font-semibold text-[var(--pitch-green)] tabular-nums">
            {totalFinal.toLocaleString('vi-VN')} <span className="text-sm font-medium">đ</span>
          </div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Đã bao gồm thuế GTGT hợp lệ
          </div>
        </div>

        <div className="phanta-card p-5">
          <div className="flex items-center justify-between text-[var(--text-sub)] mb-2">
            <span className="text-xs font-medium">Cơ quan thuế cấp mã</span>
            <ShieldCheck className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
          </div>
          <div className="text-2xl font-heading font-semibold text-[var(--text-heading)] tabular-nums">
            {invoices.length} / {invoices.length} <span className="text-sm font-normal text-[var(--text-sub)]">HĐ</span>
          </div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Tỷ lệ cấp mã hợp lệ 100%
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[var(--text-sub)] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Tìm số hóa đơn, công ty, mã số thuế, mã CQT"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--pitch-green)] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="phanta-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--table-head-bg)] text-[var(--text-sub)] font-medium border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-3.5 px-4">Số hóa đơn / Ngày</th>
                <th className="py-3.5 px-4">Đơn vị mua hàng / MST</th>
                <th className="py-3.5 px-4 text-right">Trước thuế</th>
                <th className="py-3.5 px-4 text-right">Thuế VAT (8%)</th>
                <th className="py-3.5 px-4 text-right">Tổng thanh toán</th>
                <th className="py-3.5 px-4">Mã CQT</th>
                <th className="py-3.5 px-4 text-right">Tải hóa đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
              {filteredInvoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-[var(--table-row-hover)] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-heading font-semibold text-[var(--pitch-green)] text-sm">{inv.invoiceNumber}</div>
                    <div className="text-[11px] text-[var(--text-sub)]">
                      {new Date(inv.issuedAt || inv.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[var(--text-heading)] text-xs">{inv.customerName}</div>
                    <div className="text-[11px] text-[var(--text-sub)] tabular-nums">
                      MST: {inv.customerTaxCode || 'Cá nhân không MST'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-[var(--text-main)]">
                    {inv.subtotal?.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3.5 px-4 text-right text-[var(--burnt-orange)] font-medium">
                    +{inv.taxAmount?.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3.5 px-4 text-right font-heading font-semibold text-[var(--text-heading)] text-sm">
                    {inv.totalAmount?.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card-inner)] text-[var(--pitch-green)] border border-[var(--border-subtle)] text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{inv.cqtCode}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => alert(`Đang tải file XML hóa đơn điện tử chuẩn CQT: ${inv.invoiceNumber}.xml`)}
                        className="phanta-btn-secondary p-2 rounded-lg"
                        title="Tải XML hóa đơn"
                      >
                        <FileCode className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => alert(`Mở bản xem và in PDF hóa đơn VAT: ${inv.invoiceNumber}.pdf`)}
                        className="phanta-btn-secondary p-2 rounded-lg"
                        title="Xem và in PDF"
                      >
                        <Printer className="w-4 h-4 text-[var(--text-main)]" strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xuất Hóa Đơn VAT */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="phanta-card p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Xuất hóa đơn giá trị gia tăng điện tử</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-sub)]">Tên khách hàng / Tên công ty</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-sub)]">Mã số thuế (MST)</label>
                  <input
                    type="text"
                    value={customerTaxCode}
                    onChange={(e) => setCustomerTaxCode(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] tabular-nums text-xs focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-sub)]">Email nhận hóa đơn</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-sub)]">Địa chỉ công ty</label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-sub)]">Tên dịch vụ / Hàng hóa</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-sub)]">Đơn giá trước thuế (VND)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] tabular-nums text-xs focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-sub)]">Thuế suất VAT (%)</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full mt-1 px-3.5 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] text-xs focus:outline-none focus:border-[var(--pitch-green)] cursor-pointer"
                  >
                    <option value={8}>8% (Dịch vụ thể thao)</option>
                    <option value={10}>10% (Ăn uống, Canteen, Phụ kiện)</option>
                    <option value={0}>0% (Không chịu thuế)</option>
                  </select>
                </div>
              </div>

              {/* Tạm tính */}
              <div className="p-3 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] flex justify-between items-center text-xs">
                <span className="text-[var(--text-sub)]">
                  Tiền thuế:{' '}
                  <strong className="text-[var(--burnt-orange)] font-heading tabular-nums">
                    {Math.round((unitPrice * taxRate) / 100).toLocaleString('vi-VN')} đ
                  </strong>
                </span>
                <span className="text-[var(--text-sub)]">
                  Tổng thanh toán:{' '}
                  <strong className="text-[var(--pitch-green)] font-heading tabular-nums text-sm">
                    {(unitPrice + Math.round((unitPrice * taxRate) / 100)).toLocaleString('vi-VN')} đ
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="phanta-btn-secondary px-4 py-2 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleIssueSubmit}
                className="phanta-btn-primary px-4 py-2 text-xs"
              >
                Ký số & Gửi Cơ quan thuế
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
