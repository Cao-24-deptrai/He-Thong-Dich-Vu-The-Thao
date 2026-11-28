'use client';

import React, { useState } from 'react';
import { Box, LayoutGrid, CalendarRange, Filter } from 'lucide-react';
import { SPORT_FILTERS, SportCategory, VenueItem } from '@/components/venue3d/venuesData';
import Venue3DCanvas from '@/components/venue3d/Venue3DCanvas';
import Venue2DFloorplan from '@/components/venue3d/Venue2DFloorplan';
import GanttMatrixView from '@/components/venue3d/GanttMatrixView';
import CourtInspectorDrawer from '@/components/venue3d/CourtInspectorDrawer';

type ViewMode = '3D' | '2D' | 'GANTT';

export default function Venue3DPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [sportFilter, setSportFilter] = useState<'ALL' | SportCategory>('ALL');
  const [selectedVenue, setSelectedVenue] = useState<VenueItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightsOn, setLightsOn] = useState(true);

  const handleSelectVenue = (venue: VenueItem) => {
    setSelectedVenue(venue);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setViewMode('3D')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              viewMode === '3D'
                ? 'phanta-btn-primary'
                : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Sơ đồ 3D không gian</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('2D')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              viewMode === '2D'
                ? 'phanta-btn-primary'
                : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Mặt bằng 2D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('GANTT')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              viewMode === 'GANTT'
                ? 'phanta-btn-primary'
                : 'text-[var(--text-sub)] hover:text-[var(--text-heading)]'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Lưới lịch Gantt</span>
          </button>
        </div>

        {/* Sport Category Pills Filter */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <span className="text-xs font-bold text-[var(--text-sub)] px-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--burnt-orange)]" />
            Lọc:
          </span>
          {SPORT_FILTERS.map((f) => {
            const isActive = sportFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSportFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? 'phanta-btn-primary'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View Viewport */}
      {viewMode === '3D' && (
        <Venue3DCanvas
          selectedVenueId={selectedVenue?.id || null}
          activeSportFilter={sportFilter}
          onSelectVenue={handleSelectVenue}
          lightsOn={lightsOn}
          onToggleLights={() => setLightsOn((prev) => !prev)}
        />
      )}

      {viewMode === '2D' && (
        <Venue2DFloorplan
          selectedVenueId={selectedVenue?.id || null}
          activeSportFilter={sportFilter}
          onSelectVenue={handleSelectVenue}
        />
      )}

      {viewMode === 'GANTT' && (
        <GanttMatrixView
          activeSportFilter={sportFilter}
          onSelectVenue={handleSelectVenue}
        />
      )}

      {/* Slide-out Court Inspector Drawer */}
      <CourtInspectorDrawer
        venue={selectedVenue}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lightsOn={lightsOn}
        onToggleLights={() => setLightsOn((prev) => !prev)}
      />
    </div>
  );
}
