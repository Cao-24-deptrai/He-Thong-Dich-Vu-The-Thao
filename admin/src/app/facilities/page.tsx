// admin/src/app/facilities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Layers, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api, Facility, Venue, PricingRule } from '@/lib/api';

const SPORT_TYPES = [
  { value: 'FOOTBALL', label: 'Bóng đá', icon: '⚽' },
  { value: 'BADMINTON', label: 'Cầu lông', icon: '🏸' },
  { value: 'PICKLEBALL', label: 'Pickleball', icon: '🏓' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { value: 'ESPORTS', label: 'Esports Gaming', icon: '🎮' },
  { value: 'GYM', label: 'Phòng Gym & Fitness', icon: '🏋️' },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Facility Form
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    address: '',
    sportType: 'FOOTBALL',
    description: '',
    openHour: '06:00',
    closeHour: '22:00',
  });

  // Venue Form
  const [venueForm, setVenueForm] = useState({
    name: '',
    venueType: 'Standard',
    defaultPrice: 200000,
    hasPeakHour: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    peakPrice: 300000,
  });

  // Load facilities
  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFacilities();
      setFacilities(data);
      if (data.length > 0 && !selectedFacility) {
        setSelectedFacility(data[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách cơ sở');
    } finally {
      setLoading(false);
    }
  };

  // Load venues for selected facility
  const fetchVenues = async (facilityId: string) => {
    try {
      setVenuesLoading(true);
      const data = await api.getVenues(facilityId);
      setVenues(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setVenuesLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      fetchVenues(selectedFacility._id);
    } else {
      setVenues([]);
    }
  }, [selectedFacility]);

  // Handle Create Facility
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createFacility(facilityForm as any);
      setShowFacilityModal(false);
      setFacilityForm({
        name: '',
        address: '',
        sportType: 'FOOTBALL',
        description: '',
        openHour: '06:00',
        closeHour: '22:00',
      });
      await fetchFacilities();
      setSelectedFacility(created);
    } catch (err: any) {
      alert('Lỗi tạo cơ sở: ' + (err.message || 'Thất bại'));
    }
  };

  // Handle Create Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;

    try {
      const pricingConfig: PricingRule[] = [];
      if (venueForm.hasPeakHour) {
        pricingConfig.push({
          startTime: venueForm.peakStart,
          endTime: venueForm.peakEnd,
          price: Number(venueForm.peakPrice),
        });
      }

      await api.createVenue({
        facilityId: selectedFacility._id,
        name: venueForm.name,
        venueType: venueForm.venueType,
        defaultPrice: Number(venueForm.defaultPrice),
        pricingConfig,
      });

      setShowVenueModal(false);
      setVenueForm({
        name: '',
        venueType: 'Standard',
        defaultPrice: 200000,
        hasPeakHour: true,
        peakStart: '17:00',
        peakEnd: '21:00',
        peakPrice: 300000,
      });
      await fetchVenues(selectedFacility._id);
    } catch (err: any) {
      alert('Lỗi thêm sân: ' + (err.message || 'Thất bại'));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Quản Lý Cơ Sở & Sân Bãi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mục 4.1: Thiết lập cơ sở thể thao, các sân con và biểu phí theo khung giờ (Peak Hour vs Standard)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFacilityModal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Thêm Cơ Sở Mới
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Facilities List on Left, Venues of Selected on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Facilities List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>Danh sách Cơ Sở ({facilities.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Đang tải danh sách cơ sở...
            </div>
          ) : facilities.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
              Chưa có cơ sở nào. Bấm &quot;Thêm Cơ Sở Mới&quot; để bắt đầu.
            </div>
          ) : (
            <div className="space-y-3">
              {facilities.map((fac) => {
                const sport = SPORT_TYPES.find((s) => s.value === fac.sportType) || {
                  label: fac.sportType,
                  icon: '🏅',
                };
                const isSelected = selectedFacility?._id === fac._id;

                return (
                  <div
                    key={fac._id}
                    onClick={() => setSelectedFacility(fac)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2.5 bg-white rounded-xl shadow-xs border border-slate-100">
                          {sport.icon}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 leading-snug">{fac.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate max-w-[200px]">{fac.address}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-100 text-blue-700">
                        {sport.label}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{fac.openHour || '06:00'} - {fac.closeHour || '22:00'}</span>
                      </div>
                      <div className="flex items-center text-blue-600 font-medium">
                        <span>Xem sân con</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Venues of Selected Facility */}
        <div className="lg:col-span-7 space-y-4">
          {selectedFacility ? (
            <>
              <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Sân thuộc: <span className="text-blue-600">{selectedFacility.name}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quản lý danh sách sân con, biểu giá thường và giá giờ cao điểm (Peak hour)
                  </p>
                </div>
                <button
                  onClick={() => setShowVenueModal(true)}
                  className="inline-flex items-center px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Thêm Sân Con
                </button>
              </div>

              {venuesLoading ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Đang tải danh sách sân...
                </div>
              ) : venues.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">Chưa có sân con nào</p>
                  <p className="text-xs text-slate-400 mt-1">Bấm &quot;Thêm Sân Con&quot; để thiết lập sân bãi và giá giờ.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venues.map((venue) => (
                    <div
                      key={venue._id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{venue.name}</h3>
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            Loại: {venue.venueType}
                          </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                      </div>

                      {/* Pricing Information */}
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                            Giá giờ tiêu chuẩn:
                          </span>
                          <span className="font-bold text-slate-900">
                            {(venue.defaultPrice ?? (venue as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/h
                          </span>
                        </div>

                        {(venue.pricingConfig || (venue as any).pricingRules?.peakHours || []).length > 0 ? (
                          (venue.pricingConfig || (venue as any).pricingRules?.peakHours || []).map((rule: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs bg-amber-50 p-2 rounded-lg border border-amber-100"
                            >
                              <span className="text-amber-800 font-medium flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                Giờ vàng ({rule.startTime} - {rule.endTime}):
                              </span>
                              <span className="font-bold text-amber-900">
                                {(rule.price ?? 0).toLocaleString('vi-VN')} đ/h
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            Không áp dụng giá giờ cao điểm (đồng giá mọi khung giờ)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              Vui lòng chọn một cơ sở bên trái để xem danh sách sân.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Thêm Cơ Sở Mới */}
      {showFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Thêm Cơ Sở Thể Thao Mới
            </h3>

            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Tên Cơ Sở *
                </label>
                <input
                  type="text"
                  required
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  placeholder="VD: Sân Bóng Đá Chuyên Nghiệp Thống Nhất"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Địa chỉ *
                </label>
                <input
                  type="text"
                  required
                  value={facilityForm.address}
                  onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                  placeholder="VD: 30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Bộ môn Thể thao *
                </label>
                <select
                  value={facilityForm.sportType}
                  onChange={(e) => setFacilityForm({ ...facilityForm, sportType: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {SPORT_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.icon} {st.label} ({st.value})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Giờ mở cửa
                  </label>
                  <input
                    type="text"
                    value={facilityForm.openHour}
                    onChange={(e) => setFacilityForm({ ...facilityForm, openHour: e.target.value })}
                    placeholder="06:00"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Giờ đóng cửa
                  </label>
                  <input
                    type="text"
                    value={facilityForm.closeHour}
                    onChange={(e) => setFacilityForm({ ...facilityForm, closeHour: e.target.value })}
                    placeholder="22:00"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Mô tả thêm
                </label>
                <textarea
                  rows={2}
                  value={facilityForm.description}
                  onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                  placeholder="Tiện ích, mặt sân tiêu chuẩn, đèn chiếu sáng..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFacilityModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
                >
                  Tạo Cơ Sở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm Sân Con & Cấu Hình Giá */}
      {showVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Thêm Sân Mới & Cấu Hình Giá
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Thuộc cơ sở: <strong>{selectedFacility?.name}</strong>
            </p>

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Tên Sân *
                </label>
                <input
                  type="text"
                  required
                  value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="VD: Sân 7A (Cỏ nhân tạo FIFA)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Loại sân
                  </label>
                  <input
                    type="text"
                    value={venueForm.venueType}
                    onChange={(e) => setVenueForm({ ...venueForm, venueType: e.target.value })}
                    placeholder="Standard / VIP / 7-player"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Giá chuẩn (VNĐ/giờ) *
                  </label>
                  <input
                    type="number"
                    step={10000}
                    required
                    value={venueForm.defaultPrice}
                    onChange={(e) => setVenueForm({ ...venueForm, defaultPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Peak Hour Settings (Giờ cao điểm) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={venueForm.hasPeakHour}
                      onChange={(e) => setVenueForm({ ...venueForm, hasPeakHour: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Áp dụng giá Giờ Cao Điểm (Peak Hour)</span>
                  </label>
                  <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">
                    Giờ vàng
                  </span>
                </div>

                {venueForm.hasPeakHour && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Từ giờ</label>
                      <input
                        type="text"
                        value={venueForm.peakStart}
                        onChange={(e) => setVenueForm({ ...venueForm, peakStart: e.target.value })}
                        placeholder="17:00"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Đến giờ</label>
                      <input
                        type="text"
                        value={venueForm.peakEnd}
                        onChange={(e) => setVenueForm({ ...venueForm, peakEnd: e.target.value })}
                        placeholder="21:00"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Giá cao điểm (VNĐ)</label>
                      <input
                        type="number"
                        step={10000}
                        value={venueForm.peakPrice}
                        onChange={(e) => setVenueForm({ ...venueForm, peakPrice: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVenueModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition"
                >
                  Tạo Sân Con
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
