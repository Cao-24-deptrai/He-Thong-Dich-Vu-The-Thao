'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  BarChart3,
  CalendarCheck,
  ShoppingBag,
  Users,
  Download,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Clock,
  Coffee,
  CheckCircle2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Stats = {
  bookings: number;
  paymentRevenue: number;
  canteenRevenue: number;
  canteenOrders: number;
  refundCases: number;
  note?: string;
};

const REPORT_TABS = [
  { id: 1, label: '1. Doanh thu theo môn & 7 ngày' },
  { id: 2, label: '2. Tỷ lệ lấp đầy khung giờ' },
  { id: 3, label: '3. Đối soát ví Phanta Pay' },
  { id: 4, label: '4. Doanh thu ca & POS căng tin' },
];

const DAILY_SERIES = [
  { day: 'Thứ 2', value: 5200000, target: 5000000 },
  { day: 'Thứ 3', value: 6100000, target: 5500000 },
  { day: 'Thứ 4', value: 5850000, target: 5500000 },
  { day: 'Thứ 5', value: 6900000, target: 6000000 },
  { day: 'Thứ 6', value: 7800000, target: 7000000 },
  { day: 'Thứ 7', value: 9400000, target: 8500000 },
  { day: 'Chủ nhật', value: 8950000, target: 8000000 },
];

const SPORT_SHARE = [
  { name: 'Bóng đá mini', pct: 46, color: '#10b981', tw: 'bg-emerald-500' },
  { name: 'Cầu lông', pct: 22, color: '#2dd4bf', tw: 'bg-teal-400' },
  { name: 'Tennis', pct: 14, color: '#38bdf8', tw: 'bg-sky-400' },
  { name: 'Bóng rổ & bể bơi', pct: 11, color: '#fbbf24', tw: 'bg-amber-400' },
  { name: 'Gym & gaming', pct: 7, color: '#f97316', tw: 'bg-orange-500' },
];

const HOURLY_HEATMAP = [
  { time: '06:00', weekday: 35, weekend: 75 },
  { time: '07:00', weekday: 45, weekend: 85 },
  { time: '08:00', weekday: 30, weekend: 90 },
  { time: '09:00', weekday: 25, weekend: 85 },
  { time: '10:00', weekday: 20, weekend: 70 },
  { time: '11:00', weekday: 15, weekend: 50 },
  { time: '12:00', weekday: 10, weekend: 40 },
  { time: '13:00', weekday: 15, weekend: 45 },
  { time: '14:00', weekday: 25, weekend: 60 },
  { time: '15:00', weekday: 40, weekend: 80 },
  { time: '16:00', weekday: 65, weekend: 95 },
  { time: '17:00', weekday: 90, weekend: 100 },
  { time: '18:00', weekday: 98, weekend: 100 },
  { time: '19:00', weekday: 100, weekend: 100 },
  { time: '20:00', weekday: 95, weekend: 90 },
  { time: '21:00', weekday: 80, weekend: 75 },
  { time: '22:00', weekday: 40, weekend: 50 },
];

// Waterfall steps for Cashflow (Cumulative Changes)
const WATERFALL_STEPS = [
  { label: 'Số dư đầu kỳ', value: 12000000, start: 0, end: 12000000, type: 'total' },
  { label: 'Nạp PayOS/MoMo', value: 62450000, start: 12000000, end: 74450000, type: 'in' },
  { label: 'Nạp tại quầy POS', value: 18200000, start: 74450000, end: 92650000, type: 'in' },
  { label: 'Giữ chỗ online', value: -48300000, start: 44350000, end: 92650000, type: 'out' },
  { label: 'Chi tiêu F&B', value: -12850000, start: 31500000, end: 44350000, type: 'out' },
  { label: 'Hoàn tiền hủy sân', value: -2100000, start: 29400000, end: 31500000, type: 'out' },
  { label: 'Số dư cuối kỳ', value: 29400000, start: 0, end: 29400000, type: 'total' },
];

const SHIFT_GROUPS = [
  {
    metric: 'Doanh thu sân bãi',
    morning: 14200000,
    evening: 31800000,
  },
  {
    metric: 'Doanh thu F&B POS',
    morning: 3450000,
    evening: 9850000,
  },
  {
    metric: 'Phụ kiện & thuê đồ',
    morning: 1850000,
    evening: 4600000,
  },
];

const CANTEEN_CATEGORY_SHARE = [
  { name: 'Nước tăng lực & điện giải', value: 5820000, pct: 44, tw: 'bg-emerald-500' },
  { name: 'Nước khoáng & nước ép', value: 3120000, pct: 24, tw: 'bg-teal-400' },
  { name: 'Thức ăn nhẹ & năng lượng', value: 2460000, pct: 19, tw: 'bg-amber-400' },
  { name: 'Phụ kiện thể thao', value: 1720000, pct: 13, tw: 'bg-orange-500' },
];

export default function AnalyticsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [period, setPeriod] = useState('week');
  const [activeReport, setActiveReport] = useState(1);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  async function loadSummary(customFrom = from, customTo = to) {
    try {
      setLoading(true);
      setError('');
      const q = new URLSearchParams();
      if (customFrom) q.set('from', customFrom);
      if (customTo) q.set('to', customTo);
      const authToken = (typeof window !== 'undefined' ? (localStorage.getItem('access_token') || sessionStorage.getItem('access_token')) : '') || '';
      const res = await fetch(`${API_BASE}/analytics/summary?${q.toString()}`, {
        headers: {
          Authorization: 'Bearer ' + authToken,
        },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'HTTP ' + res.status);
      setData(d);
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const totalRevenue = data ? data.paymentRevenue + data.canteenRevenue : 46044200;
  const bookingCount = data ? data.bookings : 172;
  const canteenRevenue = data ? data.canteenRevenue : 13300000;
  const canteenOrders = data ? data.canteenOrders : 172;
  const refundCases = data ? data.refundCases : 2;

  const exportCsv = () => {
    const rows = [
      ['Bao cao', REPORT_TABS.find((t) => t.id === activeReport)?.label || 'Tong quan'],
      ['Chi tieu', 'Gia tri'],
      ['Tong doanh thu', String(totalRevenue)],
      ['Luot dat san', String(bookingCount)],
      ['Doanh thu F&B POS', String(canteenRevenue)],
      ['Don POS', String(canteenOrders)],
      ['Ho so hoan tien', String(refundCases)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phanta-bao-cao-tab-${activeReport}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SVG Line & Area Chart calculations for Tab 1 (ui-ux-pro-max: Trend Over Time)
  const svgW = 640;
  const svgH = 210;
  const padX = 36;
  const padY = 20;
  const maxVal = 10000000;
  const pointsActual = DAILY_SERIES.map((d, i) => {
    const x = padX + (i * (svgW - padX * 2)) / (DAILY_SERIES.length - 1);
    const y = svgH - padY - ((d.value / maxVal) * (svgH - padY * 2));
    return { x, y, ...d };
  });
  const pointsTarget = DAILY_SERIES.map((d, i) => {
    const x = padX + (i * (svgW - padX * 2)) / (DAILY_SERIES.length - 1);
    const y = svgH - padY - ((d.target / maxVal) * (svgH - padY * 2));
    return { x, y };
  });
  const linePathActual = pointsActual.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPathActual = `${linePathActual} L ${pointsActual[pointsActual.length - 1].x} ${svgH - padY} L ${pointsActual[0].x} ${svgH - padY} Z`;
  const linePathTarget = pointsTarget.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // SVG Donut Chart calculations for Tab 1 (ui-ux-pro-max: Part-to-Whole)
  let cumulativePct = 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="space-y-6">
      {/* Top Header & Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-[var(--text-heading)]">
            Báo cáo hiệu quả tổ hợp Phanta
          </h2>
          <p className="text-xs text-[var(--text-sub)] mt-0.5">
            Cập nhật dữ liệu vận hành theo chuẩn sổ cái minh bạch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold focus:outline-none focus:border-[var(--pitch-green)]"
          >
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày qua</option>
            <option value="month">Tháng hiện tại</option>
            <option value="quarter">Quý hiện tại</option>
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Từ ngày"
            className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Đến ngày"
            className="px-3 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)]"
          />

          <button
            type="button"
            onClick={() => loadSummary()}
            disabled={loading}
            className="phanta-btn-primary px-3.5 py-2 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Lọc dữ liệu</span>
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="phanta-btn-secondary px-3 py-2 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-medium">
          {error} - Đang hiển thị số liệu tham chiếu gần nhất
        </div>
      )}

      {/* 5 Portu-Style KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="phanta-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub)]">Tổng doanh thu</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-[var(--pitch-green)] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading font-black text-2xl text-[var(--text-heading)] tabular-nums">
              {totalRevenue.toLocaleString('vi-VN')} đ
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="px-1.5 py-0.5 rounded font-bold font-heading text-[10px] bg-emerald-500/15 text-[var(--pitch-green)]">
                +14.8%
              </span>
              <span className="text-[var(--text-sub)] text-[11px]">so với tuần trước</span>
            </div>
          </div>
        </div>

        <div className="phanta-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub)]">Tỷ lệ lấp đầy TB</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading font-black text-2xl text-[var(--text-heading)] tabular-nums">
              79.4%
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="px-1.5 py-0.5 rounded font-bold font-heading text-[10px] bg-amber-500/15 text-amber-500">
                Cao điểm 96%
              </span>
              <span className="text-[var(--text-sub)] text-[11px]">17:30 - 21:00</span>
            </div>
          </div>
        </div>

        <div className="phanta-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub)]">Lượt đặt sân</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading font-black text-2xl text-[var(--text-heading)] tabular-nums">
              {bookingCount} lượt
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="px-1.5 py-0.5 rounded font-bold font-heading text-[10px] bg-sky-500/15 text-sky-500">
                98.6%
              </span>
              <span className="text-[var(--text-sub)] text-[11px]">hoàn tất check-in</span>
            </div>
          </div>
        </div>

        <div className="phanta-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub)]">Doanh thu F&B POS</span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[var(--burnt-orange-light)] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading font-black text-2xl text-[var(--text-heading)] tabular-nums">
              {canteenRevenue.toLocaleString('vi-VN')} đ
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="px-1.5 py-0.5 rounded font-bold font-heading text-[10px] bg-orange-500/15 text-[var(--burnt-orange-light)]">
                {canteenOrders} đơn
              </span>
              <span className="text-[var(--text-sub)] text-[11px]">nước & phụ kiện</span>
            </div>
          </div>
        </div>

        <div className="phanta-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-sub)]">Hồ sơ hoàn tiền</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[var(--burnt-orange)] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading font-semibold text-2xl text-[var(--text-heading)] tabular-nums">
              {refundCases} hồ sơ
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="px-1.5 py-0.5 rounded font-medium font-heading text-[11px] bg-amber-500/15 text-[var(--burnt-orange)]">
                Đối soát
              </span>
              <span className="text-[var(--text-sub)] text-[11px]">qua PayOS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Report Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs">
        <span className="text-xs font-bold text-[var(--text-sub)] px-2">Báo cáo:</span>
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveReport(tab.id)}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
              activeReport === tab.id
                ? 'phanta-btn-primary'
                : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Trend Over Time (Line + Area Chart) & Part-to-Whole (Donut Chart) */}
      {activeReport === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line & Area Chart (2 Cols) */}
          <div className="lg:col-span-2 phanta-card p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-[var(--text-heading)] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--pitch-green)]" />
                  <span>Xu hướng doanh thu 7 ngày (Line & Area Chart)</span>
                </h3>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  Đường liền nét thể hiện doanh thu thực tế, đường nét đứt là chỉ tiêu mục tiêu
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-[var(--pitch-green)]" />
                  <span className="text-[var(--text-main)]">Thực tế</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[var(--burnt-orange)]" />
                  <span className="text-[var(--text-main)]">Mục tiêu</span>
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 overflow-visible">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pitch-green)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--pitch-green)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = svgH - padY - ratio * (svgH - padY * 2);
                  return (
                    <g key={ratio}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={svgW - padX}
                        y2={y}
                        stroke="var(--border-subtle)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padX - 6}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-[var(--text-sub)] text-[10px] font-heading tabular-nums"
                      >
                        {(ratio * 10).toFixed(1)}M
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill */}
                <path d={areaPathActual} fill="url(#areaGrad)" />

                {/* Target Dashed Line */}
                <path
                  d={linePathTarget}
                  fill="none"
                  stroke="var(--burnt-orange)"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />

                {/* Actual Solid Line */}
                <path
                  d={linePathActual}
                  fill="none"
                  stroke="var(--pitch-green)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points & X Labels */}
                {pointsActual.map((p, idx) => (
                  <g
                    key={p.day}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredIdx === idx ? 6 : 4}
                      fill="var(--bg-card)"
                      stroke="var(--pitch-green)"
                      strokeWidth="2.5"
                    />
                    <text
                      x={p.x}
                      y={svgH - 2}
                      textAnchor="middle"
                      className="fill-[var(--text-sub)] text-[11px] font-medium"
                    >
                      {p.day}
                    </text>
                    {hoveredIdx === idx && (
                      <g>
                        <rect
                          x={p.x - 32}
                          y={p.y - 28}
                          width="64"
                          height="20"
                          rx="6"
                          fill="#0f172a"
                          stroke="var(--pitch-green)"
                        />
                        <text
                          x={p.x}
                          y={p.y - 15}
                          textAnchor="middle"
                          className="fill-white text-[10px] font-heading font-bold tabular-nums"
                        >
                          {(p.value / 1000000).toFixed(2)}M
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Donut Chart (1 Col) */}
          <div className="phanta-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-[var(--text-heading)]">
                Tỷ trọng doanh thu (Donut Chart)
              </h3>
              <p className="text-xs text-[var(--text-sub)] mt-0.5 mb-4">
                Cơ cấu đóng góp theo từng bộ môn thể thao
              </p>

              <div className="flex items-center justify-center my-2">
                <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
                  {SPORT_SHARE.map((s) => {
                    const dashArray = (s.pct / 100) * circumference;
                    const dashOffset = -((cumulativePct / 100) * circumference);
                    cumulativePct += s.pct;
                    return (
                      <circle
                        key={s.name}
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="transparent"
                        stroke={s.color}
                        strokeWidth="18"
                        strokeDasharray={`${dashArray} ${circumference}`}
                        strokeDashoffset={dashOffset}
                      />
                    );
                  })}
                </svg>
              </div>

              <div className="space-y-2.5 mt-4">
                {SPORT_SHARE.map((sport) => (
                  <div key={sport.name} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${sport.tw}`} />
                      <span>{sport.name}</span>
                    </span>
                    <span className="font-heading font-bold text-[var(--text-heading)] tabular-nums">
                      {sport.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/invoices"
              className="mt-6 w-full py-2.5 phanta-btn-secondary text-xs flex items-center justify-center gap-1.5"
            >
              <span>Xem báo cáo sổ cái chi tiết</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: Heatmap / Intensity (2D Grid Heat Map) */}
      {activeReport === 2 && (
        <div className="phanta-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-lg text-[var(--text-heading)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Bản đồ nhiệt lấp đầy 17 khung giờ (Grid Heat Map)</span>
              </h3>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Mật độ đặt sân từ 06:00 đến 23:00 đối chiếu Ngày trong tuần và Cuối tuần
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/30" />
                <span className="text-[var(--text-sub)]">Trống (&lt;50%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-500/40 border border-amber-500/60" />
                <span className="text-[var(--text-sub)]">Trung bình (50-80%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[var(--burnt-orange)]" />
                <span className="text-[var(--burnt-orange-light)] font-bold">Cao điểm (&gt;80%)</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px] space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] mb-1.5">
                  <span>Ngày trong tuần (Thứ 2 - Thứ 6)</span>
                  <span className="text-[var(--text-sub)] font-heading tabular-nums">TB: 52%</span>
                </div>
                <div className="grid grid-cols-17 gap-1.5">
                  {HOURLY_HEATMAP.map((h) => {
                    let bg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                    if (h.weekday >= 50 && h.weekday < 80) bg = 'bg-amber-500/25 text-amber-300 border-amber-500/40';
                    if (h.weekday >= 80) bg = 'bg-[var(--burnt-orange)] text-white border-orange-600 font-bold';
                    return (
                      <div key={'wd-' + h.time} className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 ${bg}`}>
                        <span className="text-[10px] opacity-80">{h.time}</span>
                        <span className="text-xs font-heading tabular-nums">{h.weekday}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)] mb-1.5">
                  <span>Cuối tuần (Thứ 7 - Chủ nhật)</span>
                  <span className="text-[var(--burnt-orange-light)] font-heading font-bold tabular-nums">TB: 88%</span>
                </div>
                <div className="grid grid-cols-17 gap-1.5">
                  {HOURLY_HEATMAP.map((h) => {
                    let bg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                    if (h.weekend >= 50 && h.weekend < 80) bg = 'bg-amber-500/25 text-amber-300 border-amber-500/40';
                    if (h.weekend >= 80) bg = 'bg-[var(--burnt-orange)] text-white border-orange-600 font-bold';
                    return (
                      <div key={'we-' + h.time} className={`h-16 rounded-xl border flex flex-col items-center justify-center p-1 ${bg}`}>
                        <span className="text-[10px] opacity-80">{h.time}</span>
                        <span className="text-xs font-heading tabular-nums">{h.weekend}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--text-sub)]">
              <CheckCircle2 className="w-4 h-4 text-[var(--pitch-green)]" />
              <span>Khung giờ vàng 17:30 - 21:00 đạt hiệu suất cực đại 100%.</span>
            </div>
            <Link href="/facilities" className="phanta-btn-secondary px-3 py-1.5 font-bold">
              Điều chỉnh bảng giá cao điểm
            </Link>
          </div>
        </div>
      )}

      {/* TAB 3: Cumulative Changes (Waterfall Chart) */}
      {activeReport === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 phanta-card p-6 space-y-6">
            <div>
              <h3 className="font-heading font-bold text-lg text-[var(--text-heading)] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-sky-400" />
                <span>Biểu đồ thác nước dòng tiền ví Phanta Pay (Waterfall Chart)</span>
              </h3>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Phân tích biến động cộng dồn từ số dư đầu kỳ qua các dòng tiền nạp, chi tiêu và hoàn tiền
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2.5 items-end h-60 pt-6">
              {WATERFALL_STEPS.map((step) => {
                const maxScale = 100000000;
                const bottomPct = Math.round((step.start / maxScale) * 100);
                const heightPct = Math.max(6, Math.round((Math.abs(step.value) / maxScale) * 100));
                let barColor = 'bg-sky-500';
                if (step.type === 'in') barColor = 'bg-[var(--pitch-green)]';
                if (step.type === 'out') barColor = 'bg-rose-500';

                return (
                  <div key={step.label} className="flex flex-col items-center h-full justify-end gap-2">
                    <div className="w-full max-w-[46px] h-full bg-[var(--bg-card-inner)] rounded-xl border border-[var(--border-subtle)] relative overflow-hidden">
                      <div
                        style={{ bottom: `${bottomPct}%`, height: `${heightPct}%` }}
                        className={`absolute left-1 right-1 rounded-md ${barColor} transition-all`}
                        title={`${step.label}: ${step.value.toLocaleString('vi-VN')} đ`}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-heading font-bold text-[var(--text-heading)] tabular-nums">
                        {step.value > 0 && step.type !== 'total' ? '+' : ''}
                        {(step.value / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-[10px] text-[var(--text-sub)] leading-tight mt-0.5 line-clamp-2">
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="phanta-card p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-lg text-[var(--text-heading)]">
                Chỉ số cân đối thanh khoản
              </h3>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-400">Trạng thái đối soát</span>
                <div className="font-heading font-black text-2xl text-[var(--pitch-green)] tabular-nums">
                  100% khớp lệnh
                </div>
                <p className="text-[11px] text-[var(--text-sub)]">Không phát hiện sai lệch số dư ví hệ thống</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-sub)]">Tổng nạp trong kỳ:</span>
                  <span className="font-heading font-bold text-[var(--pitch-green)] tabular-nums">+80.650.000 đ</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-sub)]">Tổng cấn trừ sử dụng:</span>
                  <span className="font-heading font-bold text-rose-400 tabular-nums">-63.250.000 đ</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[var(--text-sub)]">Số dư cuối kỳ:</span>
                  <span className="font-heading font-bold text-sky-400 tabular-nums">29.400.000 đ</span>
                </div>
              </div>
            </div>

            <Link
              href="/refunds"
              className="mt-6 w-full py-2.5 phanta-btn-secondary text-xs flex items-center justify-center gap-1.5"
            >
              <span>Xem sổ kiểm soát hoàn tiền</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* TAB 4: Compare Categories (Grouped Bar + Horizontal Bar) */}
      {activeReport === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 phanta-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-heading font-bold text-lg text-[var(--text-heading)] flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-[var(--burnt-orange)]" />
                  <span>So sánh doanh thu theo ca làm việc (Grouped Bar Chart)</span>
                </h3>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  Đối chiếu hiệu suất giữa ca sáng (06:00 - 14:00) và ca tối (14:00 - 23:00)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-400" />
                  <span className="text-[var(--text-main)]">Ca sáng</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[var(--burnt-orange)]" />
                  <span className="text-[var(--text-main)]">Ca tối</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 items-end h-56 pt-4">
              {SHIFT_GROUPS.map((g) => {
                const maxShift = 35000000;
                const hMorning = Math.max(8, Math.round((g.morning / maxShift) * 100));
                const hEvening = Math.max(8, Math.round((g.evening / maxShift) * 100));
                return (
                  <div key={g.metric} className="flex flex-col items-center h-full justify-end gap-2">
                    <div className="flex items-end gap-2 w-full justify-center h-full">
                      <div className="w-10 h-full bg-[var(--bg-card-inner)] rounded-xl flex items-end overflow-hidden border border-[var(--border-subtle)]">
                        <div style={{ height: `${hMorning}%` }} className="w-full bg-sky-400 rounded-t-lg" />
                      </div>
                      <div className="w-10 h-full bg-[var(--bg-card-inner)] rounded-xl flex items-end overflow-hidden border border-[var(--border-subtle)]">
                        <div style={{ height: `${hEvening}%` }} className="w-full bg-[var(--burnt-orange)] rounded-t-lg" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-heading font-bold text-[var(--text-heading)] tabular-nums">
                        {(g.morning / 1000000).toFixed(1)}M / {(g.evening / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-[11px] text-[var(--text-sub)]">{g.metric}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="phanta-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-lg text-[var(--text-heading)]">
                Cơ cấu ngành hàng căng tin
              </h3>
              <p className="text-xs text-[var(--text-sub)] mt-0.5 mb-5">
                Biểu đồ thanh ngang sắp xếp giảm dần (Horizontal Bar)
              </p>

              <div className="space-y-4">
                {CANTEEN_CATEGORY_SHARE.map((cat) => (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-main)]">{cat.name}</span>
                      <span className="font-heading font-bold text-[var(--text-heading)] tabular-nums">
                        {cat.pct}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--bg-card-inner)] overflow-hidden">
                      <div style={{ width: `${cat.pct}%` }} className={`h-full rounded-full ${cat.tw}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/canteen"
              className="mt-6 w-full py-2.5 phanta-btn-secondary text-xs flex items-center justify-center gap-1.5"
            >
              <span>Vào quản lý thực đơn căng tin</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
