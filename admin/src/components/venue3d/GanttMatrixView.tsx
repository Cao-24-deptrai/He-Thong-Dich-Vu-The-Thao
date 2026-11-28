'use client';

import React from 'react';
import { VENUES_DATA, VenueItem, SportCategory } from './venuesData';

interface GanttMatrixViewProps {
  activeSportFilter: 'ALL' | SportCategory;
  onSelectVenue: (venue: VenueItem, preselectedHour?: string) => void;
}

const HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

const PEAK_HOURS = new Set(['17:00', '18:00', '19:00', '20:00']);

const MOCK_BLOCKS: Record<string, { startCol: number; span: number; label: string; tone: 'emerald' | 'orange' | 'blue' | 'purple' }[]> = {
  'fb-cluster-1': [
    { startCol: 1, span: 2, label: 'FC Banker VIP', tone: 'blue' },
    { startCol: 8, span: 2, label: 'HĐ FPT Software', tone: 'purple' },
    { startCol: 12, span: 2, label: 'Giải Tứ Hùng', tone: 'orange' },
  ],
  'fb-cluster-2': [
    { startCol: 2, span: 2, label: 'CLB Thăng Long', tone: 'emerald' },
    { startCol: 11, span: 2, label: 'FC Techcombank', tone: 'orange' },
  ],
  'badminton-hall': [
    { startCol: 0, span: 2, label: 'CLB Ba Đình', tone: 'purple' },
    { startCol: 13, span: 2, label: 'Nhóm Anh Hoàng', tone: 'orange' },
  ],
  'tennis-hall': [
    { startCol: 0, span: 2, label: 'Tập huấn sáng', tone: 'emerald' },
    { startCol: 12, span: 2, label: 'Trận bán kết T1', tone: 'orange' },
  ],
  'basketball-court': [
    { startCol: 10, span: 2, label: 'Hanoi Buffaloes U19', tone: 'blue' },
  ],
  'pool-olympic': [
    { startCol: 1, span: 3, label: 'Lớp bơi thiếu nhi', tone: 'blue' },
    { startCol: 11, span: 2, label: 'CLB Bơi Phanta', tone: 'emerald' },
  ],
  'pool-warm': [
    { startCol: 3, span: 2, label: 'Phục hồi chức năng', tone: 'emerald' },
  ],
  'gym-complex': [
    { startCol: 11, span: 3, label: 'Ca tập PT cao điểm', tone: 'orange' },
  ],
  'esport-vip': [
    { startCol: 7, span: 4, label: 'Vikings Gaming Scrim', tone: 'purple' },
  ],
};

export default function GanttMatrixView({
  activeSportFilter,
  onSelectVenue,
}: GanttMatrixViewProps) {
  const filteredVenues = VENUES_DATA.filter(
    (v) => activeSportFilter === 'ALL' || v.category === activeSportFilter
  );

  const toneClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/85 text-[#0C0F0C]',
    orange: 'bg-orange-500/90 text-[#0C0F0C]',
    blue: 'bg-sky-500/85 text-[#0C0F0C]',
    purple: 'bg-purple-400/90 text-[#0C0F0C]',
  };

  return (
    <div className="phanta-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="font-heading font-bold text-lg text-[var(--text-heading)]">
            Lưới lịch Gantt theo khung giờ (06:00 - 23:00)
          </h3>
          <p className="text-xs text-[var(--text-sub)] mt-0.5">
            Nhấp vào ô trống hoặc tên cụm sân để mở bảng đặt lịch nhanh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--text-main)]">
            <span className="w-3 h-3 rounded bg-emerald-500/85" /> Đang hoạt động
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-main)]">
            <span className="w-3 h-3 rounded bg-orange-500/90" /> Giờ cao điểm (17h - 21h)
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-main)]">
            <span className="w-3 h-3 rounded bg-sky-500/85" /> Đã cọc
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-main)]">
            <span className="w-3 h-3 rounded bg-purple-400/90" /> Hợp đồng cố định
          </span>
        </div>
      </div>

      <div className="border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <div className="min-w-[1280px]">
            {/* Header Row */}
            <div className="flex items-center border-b border-[var(--border-color)] bg-[var(--table-head-bg)] text-xs font-heading font-bold text-[var(--text-sub)]">
              <div className="w-60 p-3 shrink-0 border-r border-[var(--border-color)] text-[var(--text-heading)]">
                CỤM SÂN & DỊCH VỤ
              </div>
              <div className="flex-1 grid grid-cols-17 text-center">
                {HOURS.map((hr) => {
                  const isPeak = PEAK_HOURS.has(hr);
                  return (
                    <div
                      key={hr}
                      className={`py-2.5 border-r border-[var(--border-subtle)] tabular-nums ${
                        isPeak ? 'bg-orange-500/10 text-[var(--burnt-orange-light)]' : ''
                      }`}
                    >
                      {hr}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Venue Rows */}
            <div className="divide-y divide-[var(--border-subtle)]">
              {filteredVenues.map((venue) => {
                const blocks = MOCK_BLOCKS[venue.id] || [];
                return (
                  <div
                    key={venue.id}
                    className="flex items-center hover:bg-[var(--table-row-hover)] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectVenue(venue)}
                      className="w-60 p-3 shrink-0 border-r border-[var(--border-color)] text-left"
                    >
                      <div className="text-xs font-bold text-[var(--text-heading)] truncate">
                        {venue.shortName}
                      </div>
                      <div className="text-[11px] font-heading font-bold text-[var(--pitch-green)] mt-0.5 tabular-nums">
                        {(venue.basePrice / 1000).toFixed(0)}k - {(venue.peakPrice / 1000).toFixed(0)}k/h
                      </div>
                    </button>

                    <div className="flex-1 h-14 relative grid grid-cols-17 divide-x divide-[var(--border-subtle)]">
                      {HOURS.map((hr) => {
                        const isPeak = PEAK_HOURS.has(hr);
                        return (
                          <button
                            key={hr}
                            type="button"
                            onClick={() => onSelectVenue(venue, hr)}
                            title={`Đặt ${venue.shortName} lúc ${hr}`}
                            className={`h-full transition-colors hover:bg-[var(--accent-badge)] ${
                              isPeak ? 'bg-orange-500/[0.04]' : ''
                            }`}
                          />
                        );
                      })}

                      {/* Overlay Mock Booking Blocks */}
                      {blocks.map((blk, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSelectVenue(venue)}
                          style={{
                            left: `calc(${(blk.startCol / 17) * 100}% + 3px)`,
                            width: `calc(${(blk.span / 17) * 100}% - 6px)`,
                          }}
                          className={`absolute top-2 bottom-2 rounded-lg px-2 text-[10px] font-bold truncate flex items-center shadow-sm ${
                            toneClasses[blk.tone]
                          }`}
                        >
                          {blk.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
