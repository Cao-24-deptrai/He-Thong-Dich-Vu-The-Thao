'use client';

import React from 'react';
import { VENUES_DATA, VenueItem, SportCategory } from './venuesData';

interface Venue2DFloorplanProps {
  selectedVenueId: string | null;
  activeSportFilter: 'ALL' | SportCategory;
  onSelectVenue: (venue: VenueItem) => void;
}

export default function Venue2DFloorplan({
  selectedVenueId,
  activeSportFilter,
  onSelectVenue,
}: Venue2DFloorplanProps) {
  const zones = [
    {
      title: 'Phân khu Tây - Sân bóng đá cỏ nhân tạo',
      coords: 'X = -38',
      ids: ['fb-cluster-1', 'fb-cluster-2'],
    },
    {
      title: 'Phân khu Trung tâm - Sân đấu đa năng',
      coords: 'X = 0',
      ids: ['badminton-hall', 'tennis-hall', 'basketball-court'],
    },
    {
      title: 'Phân khu Đông - Hồ bơi, Gym & Gaming',
      coords: 'X = +38 đến +64',
      ids: ['pool-olympic', 'pool-warm', 'gym-complex', 'esport-vip'],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {zones.map((zone) => {
        const zoneVenues = VENUES_DATA.filter(
          (v) =>
            zone.ids.includes(v.id) &&
            (activeSportFilter === 'ALL' || v.category === activeSportFilter)
        );

        return (
          <div key={zone.title} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <h3 className="font-heading font-bold text-sm text-[var(--text-heading)]">
                {zone.title}
              </h3>
              <span className="text-[11px] font-heading text-[var(--text-sub)] tabular-nums">
                {zone.coords}
              </span>
            </div>

            {zoneVenues.length === 0 ? (
              <div className="phanta-card p-6 text-center text-xs text-[var(--text-muted)]">
                Không có cụm sân thuộc bộ môn đang lọc tại phân khu này
              </div>
            ) : (
              <div className="space-y-3">
                {zoneVenues.map((venue) => {
                  const isSelected = selectedVenueId === venue.id;
                  return (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => onSelectVenue(venue)}
                      className={`w-full text-left phanta-card p-4 transition-colors cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-[var(--pitch-green)] bg-[var(--accent-badge)]'
                          : 'hover:border-[var(--pitch-green)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--accent-badge)] text-[var(--pitch-green)] mb-1">
                            {venue.categoryLabel}
                          </span>
                          <h4 className="font-heading font-bold text-sm text-[var(--text-heading)] truncate">
                            {venue.name}
                          </h4>
                          <p className="text-[11px] text-[var(--text-sub)] mt-0.5 line-clamp-2">
                            {venue.subtitle}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-heading font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-card-inner)] text-[var(--pitch-green)] border border-[var(--border-subtle)] tabular-nums">
                          {(venue.basePrice / 1000).toFixed(0)}k - {(venue.peakPrice / 1000).toFixed(0)}k/h
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[var(--border-subtle)] text-[var(--text-sub)]">
                        <span className="font-semibold text-[var(--pitch-green)]">
                          Sẵn sàng nhận lịch
                        </span>
                        <span className="font-heading tabular-nums">
                          Kích thước: {venue.dimensions.w}m x {venue.dimensions.h}m
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
