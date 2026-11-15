// admin/src/components/GanttTimelineChart.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  RefreshCw, 
  Calendar,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api, Venue, SlotAvailability } from '@/lib/api';

interface GanttTimelineChartProps {
  venues: Venue[];
  selectedDate: string;
  selectedVenueId: string;
  selectedSlot: SlotAvailability | null;
  onSelectSlot: (venue: Venue, slot: SlotAvailability) => void;
  onRefresh?: () => void;
}

// 17 Hourly Intervals from 06:00 to 23:00
const TIMELINE_HOURS = Array.from({ length: 17 }).map((_, i) => {
  const h = 6 + i;
  const startStr = `${h.toString().padStart(2, '0')}:00`;
  const endStr = `${(h + 1).toString().padStart(2, '0')}:00`;
  const isPeak = h >= 17 && h < 21; // Peak hours: 17:00 - 21:00
  return { hour: h, startStr, endStr, isPeak };
});

export const GanttTimelineChart: React.FC<GanttTimelineChartProps> = ({
  venues,
  selectedDate,
  selectedVenueId,
  selectedSlot,
  onSelectSlot,
  onRefresh,
}) => {
  // Map venueId -> list of slots
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, SlotAvailability[]>>({});
  const [loading, setLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'sm' | 'md' | 'lg'>('md');
  const [hoveredSlot, setHoveredSlot] = useState<{ venue: Venue; slot: SlotAvailability } | null>(null);

  // Drag selection states
  const [isDragging, setIsDragging] = useState(false);
  const [dragVenueId, setDragVenueId] = useState<string | null>(null);

  // Current time position (if today)
  const [nowPositionPercent, setNowPositionPercent] = useState<number | null>(null);
  const [nowTimeStr, setNowTimeStr] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Load availability for all venues
  const loadAllVenuesAvailability = async () => {
    if (venues.length === 0 || !selectedDate) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        venues.map((v) => api.getVenueAvailability(v._id, selectedDate))
      );

      const map: Record<string, SlotAvailability[]> = {};
      results.forEach((res, idx) => {
        const venue = venues[idx];
        if (res.status === 'fulfilled' && res.value?.slots) {
          map[venue._id] = res.value.slots;
        } else {
          map[venue._id] = [];
        }
      });
      setAvailabilityMap(map);
    } catch (err) {
      console.error('Failed to load Gantt availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllVenuesAvailability();
  }, [venues, selectedDate]);

  // Calculate Now indicator
  useEffect(() => {
    if (!isToday) {
      setNowPositionPercent(null);
      return;
    }

    const updateNow = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      setNowTimeStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);

      // Timeline is 06:00 to 23:00 (17 hours = 1020 minutes)
      const startMin = 6 * 60;
      const endMin = 23 * 60;
      const curMin = h * 60 + m;

      if (curMin >= startMin && curMin <= endMin) {
        const pct = ((curMin - startMin) / (endMin - startMin)) * 100;
        setNowPositionPercent(pct);
      } else {
        setNowPositionPercent(null);
      }
    };

    updateNow();
    const timer = setInterval(updateNow, 60000);
    return () => clearInterval(timer);
  }, [isToday]);

  // Metrics summary
  const allSlots = Object.values(availabilityMap).flat();
  const totalSlotsCount = allSlots.length || venues.length * 17;
  const confirmedCount = allSlots.filter((s) => s.status === 'CONFIRMED').length;
  const heldCount = allSlots.filter((s) => s.status === 'HELD').length;
  const availableCount = allSlots.filter((s) => s.status === 'AVAILABLE').length;
  const occupancyRate = totalSlotsCount > 0 ? Math.round(((confirmedCount + heldCount) / totalSlotsCount) * 100) : 0;

  // Column width by zoom
  const colWidth = zoomLevel === 'sm' ? 68 : zoomLevel === 'md' ? 88 : 115;

  // Handle Drag Selection
  const handleSlotMouseDown = (venue: Venue, slot: SlotAvailability) => {
    if (slot.status !== 'AVAILABLE') return;
    setIsDragging(true);
    setDragVenueId(venue._id);
    onSelectSlot(venue, slot);
  };

  const handleSlotMouseEnter = (venue: Venue, slot: SlotAvailability) => {
    if (isDragging && dragVenueId === venue._id && slot.status === 'AVAILABLE') {
      onSelectSlot(venue, slot);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100">
      {/* Top Header & Metrics */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Bảng Lịch Timeline Gantt Chart Trực Quan
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kéo chuột hoặc bấm vào ô giờ để chọn nhanh sân & khung giờ đặt chỗ
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs flex items-center gap-2">
            <span className="text-slate-400 font-medium">Tổng sân:</span>
            <strong className="text-white font-mono">{venues.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-700/40 text-xs flex items-center gap-2 text-emerald-300">
            <span>Còn trống:</span>
            <strong className="font-mono font-bold">{availableCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-700/40 text-xs flex items-center gap-2 text-rose-300">
            <span>Đã đặt:</span>
            <strong className="font-mono font-bold">{confirmedCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-950/50 border border-blue-700/40 text-xs flex items-center gap-2 text-blue-300">
            <span>Công suất:</span>
            <strong className="font-mono font-bold">{occupancyRate}%</strong>
          </div>

          {/* Zoom & Refresh Controls */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setZoomLevel('sm')}
              className={`px-2 py-1 text-xs rounded-lg transition font-medium ${zoomLevel === 'sm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Thu nhỏ"
            >
              Thu nhỏ
            </button>
            <button
              onClick={() => setZoomLevel('md')}
              className={`px-2 py-1 text-xs rounded-lg transition font-medium ${zoomLevel === 'md' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Vừa"
            >
              Chuẩn
            </button>
            <button
              onClick={() => setZoomLevel('lg')}
              className={`px-2 py-1 text-xs rounded-lg transition font-medium ${zoomLevel === 'lg' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Phóng to"
            >
              Phóng to
            </button>
          </div>

          <button
            onClick={() => {
              loadAllVenuesAvailability();
              if (onRefresh) onRefresh();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Làm mới lịch sân"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Gantt Timeline Matrix (Horizontal Scroll) */}
      <div className="relative overflow-x-auto select-none" style={{ maxHeight: '480px' }}>
        <div style={{ minWidth: 200 + TIMELINE_HOURS.length * colWidth }}>
          {/* Header Row: Venue Column + 17 Hourly Blocks */}
          <div className="sticky top-0 z-30 flex bg-slate-950 border-b border-slate-800 shadow-md">
            {/* Sticky Left Corner Header */}
            <div className="sticky left-0 z-40 w-52 shrink-0 p-3 bg-slate-950 border-r border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Danh Sách Sân
              </span>
              <span className="text-[10px] text-slate-500 font-mono">06:00 - 23:00</span>
            </div>

            {/* Hourly Headers */}
            <div className="flex relative">
              {TIMELINE_HOURS.map((slot) => (
                <div
                  key={slot.hour}
                  style={{ width: colWidth }}
                  className={`shrink-0 py-2.5 px-1 text-center border-r border-slate-800/80 ${
                    slot.isPeak ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-slate-200">
                    {slot.startStr}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {slot.endStr}
                  </div>
                  {slot.isPeak && (
                    <span className="inline-block mt-0.5 px-1 py-0.2 text-[8px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Peak
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Body Rows: One Row per Venue */}
          <div className="relative divide-y divide-slate-800/60">
            {/* Realtime Now Line Indicator */}
            {nowPositionPercent !== null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none transition-all duration-1000"
                style={{
                  left: `calc(13rem + (100% - 13rem) * ${nowPositionPercent / 100})`,
                }}
              >
                <div className="w-0.5 h-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                <div className="absolute -top-3 -translate-x-1/2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                  NOW {nowTimeStr}
                </div>
              </div>
            )}

            {venues.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Chưa có sân con nào trong cơ sở này.
              </div>
            ) : (
              venues.map((venue) => {
                const venueSlots = availabilityMap[venue._id] || [];
                const isVenueSelected = selectedVenueId === venue._id;

                return (
                  <div
                    key={venue._id}
                    className={`flex items-center hover:bg-slate-800/30 transition-colors ${
                      isVenueSelected ? 'bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Sticky Left Venue Info Cell */}
                    <div
                      className={`sticky left-0 z-10 w-52 shrink-0 p-3 bg-slate-900 border-r border-slate-800 ${
                        isVenueSelected ? 'bg-blue-950/40 border-l-4 border-l-cyan-400' : ''
                      }`}
                    >
                      <div className="font-bold text-sm text-white truncate" title={venue.name}>
                        {venue.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                          {venue.venueType || 'Tiêu chuẩn'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          {((venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Timeline Slots Cells */}
                    <div className="flex">
                      {TIMELINE_HOURS.map((hInfo) => {
                        // Find matching slot from API
                        const slot = venueSlots.find((s) => s.startTime === hInfo.startStr) || {
                          startTime: hInfo.startStr,
                          endTime: hInfo.endStr,
                          price: (venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000,
                          status: 'AVAILABLE',
                          isAvailable: true,
                        };


                        const isSelected =
                          selectedVenueId === venue._id &&
                          selectedSlot?.startTime === slot.startTime;

                        const isAvailable = slot.status === 'AVAILABLE';
                        const isHeld = slot.status === 'HELD';
                        const isConfirmed = slot.status === 'CONFIRMED';
                        const isPast = slot.status === 'PAST';

                        let cellBg = 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-400 cursor-pointer';
                        let statusText = 'Trống';

                        if (isHeld) {
                          cellBg = 'bg-amber-950/30 border-amber-700/50 text-amber-300 cursor-not-allowed';
                          statusText = 'Giữ chỗ';
                        } else if (isConfirmed) {
                          cellBg = 'bg-rose-950/35 border-rose-700/50 text-rose-300 cursor-not-allowed';
                          statusText = 'Đã đặt';
                        } else if (isPast) {
                          cellBg = 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed';
                          statusText = 'Qua giờ';
                        }

                        if (isSelected) {
                          cellBg = 'bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] z-10';
                          statusText = '✓ Chọn';
                        }

                        return (
                          <div
                            key={hInfo.hour}
                            style={{ width: colWidth }}
                            className="shrink-0 p-1 border-r border-slate-800/80"
                            onMouseDown={() => handleSlotMouseDown(venue, slot as SlotAvailability)}
                            onMouseEnter={() => {
                              handleSlotMouseEnter(venue, slot as SlotAvailability);
                              setHoveredSlot({ venue, slot: slot as SlotAvailability });
                            }}
                            onMouseLeave={() => setHoveredSlot(null)}
                          >
                            <div
                              className={`h-14 rounded-xl border p-1.5 flex flex-col justify-between transition-all duration-150 ${cellBg}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold opacity-90">
                                  {slot.startTime}
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isAvailable
                                      ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                                      : isHeld
                                      ? 'bg-amber-400'
                                      : isConfirmed
                                      ? 'bg-rose-400'
                                      : 'bg-slate-600'
                                  }`}
                                />
                              </div>

                              <div className="text-[10px] font-semibold truncate leading-tight">
                                {statusText}
                              </div>

                              <div className="text-[9px] font-mono opacity-80 truncate">
                                {(slot.price || 0).toLocaleString('vi-VN')} đ
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Legend Bar */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Chú thích:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-emerald-300 font-medium">Trống (Sẵn sàng đặt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40" />
            <span className="text-amber-300 font-medium">Đang giữ chỗ (10 phút)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40" />
            <span className="text-rose-300 font-medium">Đã thanh toán</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
            <span className="text-slate-500 font-medium">Đã qua giờ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-cyan-500/30 border border-cyan-400 ring-1 ring-cyan-400" />
            <span className="text-cyan-300 font-medium">Đang chọn</span>
          </div>
        </div>

        {hoveredSlot && (
          <div className="text-xs text-slate-300 flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <span className="font-bold text-white">{hoveredSlot.venue.name}</span>
            <span>•</span>
            <span className="font-mono text-cyan-400 font-bold">
              {hoveredSlot.slot.startTime} - {hoveredSlot.slot.endTime}
            </span>
            <span>•</span>
            <span className="font-mono text-emerald-400 font-bold">
              {(hoveredSlot.slot.price || 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
