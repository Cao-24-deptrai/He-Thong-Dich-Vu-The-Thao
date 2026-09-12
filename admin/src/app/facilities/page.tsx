// admin/src/app/facilities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Clock, 
  DollarSign, 
  Layers, 
  Sparkles, 
  AlertCircle,
  X,
  ChevronRight,
  Shield,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api, Facility, Venue, PricingRule } from '@/lib/api';

const SPORT_TYPES = [
  { value: 'FOOTBALL', label: 'Bóng đá Mini & Sân 7', icon: '⚽' },
  { value: 'BADMINTON', label: 'Cầu lông Chuyên nghiệp', icon: '🏸' },
  { value: 'PICKLEBALL', label: 'Pickleball Tiêu chuẩn QT', icon: '🏓' },
  { value: 'TENNIS', label: 'Quần vợt Tennis', icon: '🎾' },
  { value: 'ESPORTS', label: 'Cyber Gaming & PS5 Lounge', icon: '🎮' },
  { value: 'GYM', label: 'Gym & Fitness Center', icon: '🏋️' },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Form states
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    address: '',
    sportType: 'FOOTBALL',
    description: '',
    openHour: '06:00',
    closeHour: '23:00',
  });

  const [venueForm, setVenueForm] = useState({
    name: '',
    venueType: 'Standard',
    defaultPrice: 200000,
    hasPeakHour: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    peakPrice: 300000,
  });

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
      setError(err.message || 'Không thể tải danh sách cơ sở');
    } finally {
      setLoading(false);
    }
  };

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
    }
  }, [selectedFacility]);

  // Create Facility
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFacility(facilityForm as any);
      setShowFacilityModal(false);
      setFacilityForm({
        name: '',
        address: '',
        sportType: 'FOOTBALL',
        description: '',
        openHour: '06:00',
        closeHour: '23:00',
      });
      await fetchFacilities();
    } catch (err: any) {
      alert('Lỗi tạo cơ sở: ' + (err.message || 'Thất bại'));
    }
  };

  // Create Venue
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
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Quản Lý Cơ Sở & Sân Bãi
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  FACILITIES
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Mục 4.1: Thiết lập cơ sở thể thao, hệ thống sân con và biểu giá giờ cao điểm (Peak Hours)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFacilityModal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl text-xs font-black hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + THÊM CƠ SỞ MỚI
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Facilities List on Left, Venues of Selected on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Facilities List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Cơ Sở Hoạt Động ({facilities.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
              Đang tải danh sách cơ sở...
            </div>
          ) : facilities.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
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
                    className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 backdrop-blur-md ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <span className="text-2xl p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-inner">
                          {sport.icon}
                        </span>
                        <div>
                          <h3 className="font-extrabold text-white text-base leading-snug">{fac.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                            <span className="truncate max-w-[200px]">{fac.address}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {sport.label.split(' ')[0]}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{fac.openHour || '06:00'} - {fac.closeHour || '23:00'}</span>
                      </div>
                      <div className="flex items-center text-cyan-400 font-bold text-xs">
                        <span>Chi tiết sân con</span>
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
              <div className="flex items-center justify-between bg-slate-900/90 p-5 rounded-3xl border border-slate-800 backdrop-blur-md">
                <div>
                  <h2 className="text-base font-black text-white">
                    Sân thuộc: <span className="text-cyan-400">{selectedFacility.name}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quản lý danh sách sân con, biểu giá thường và giá giờ cao điểm (Peak hours)
                  </p>
                </div>
                <button
                  onClick={() => setShowVenueModal(true)}
                  className="inline-flex items-center px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl text-xs font-black hover:from-emerald-700 hover:to-teal-600 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  + Thêm Sân Con
                </button>
              </div>

              {venuesLoading ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
                  Đang tải danh sách sân con...
                </div>
              ) : venues.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
                  <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-slate-300">Chưa có sân con nào</p>
                  <p className="text-xs text-slate-500 mt-1">Bấm &quot;+ Thêm Sân Con&quot; để thiết lập vị trí và giá giờ.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venues.map((venue) => (
                    <div
                      key={venue._id}
                      className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800/90 backdrop-blur-md shadow-lg hover:border-cyan-500/40 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-white text-base">{venue.name}</h3>
                          <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                            {venue.venueType || 'Tiêu chuẩn'}
                          </span>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 shadow-[0_0_8px_#10b981]" />
                      </div>

                      {/* Pricing Information */}
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                            Giá giờ tiêu chuẩn:
                          </span>
                          <span className="font-mono font-black text-emerald-400">
                            {((venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/h
                          </span>
                        </div>

                        {(venue.pricingConfig || (venue as any).pricingRules?.peakHours || []).length > 0 ? (
                          (venue.pricingConfig || (venue as any).pricingRules?.peakHours || []).map((rule: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40"
                            >
                              <span className="text-amber-300 font-bold flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                Giờ vàng ({rule.startTime} - {rule.endTime}):
                              </span>
                              <span className="font-mono font-black text-amber-300">
                                {(rule.price ?? 0).toLocaleString('vi-VN')} đ/h
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">
                            Đồng giá mọi khung giờ trong ngày
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
              Vui lòng chọn một cơ sở bên trái để xem danh sách sân.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Thêm Cơ Sở Mới */}
      {showFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative">
            <button
              onClick={() => setShowFacilityModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Thiết Lập Cơ Sở Thể Thao Mới
            </h3>

            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên cơ sở
                </label>
                <input
                  type="text"
                  required
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  placeholder="Ví dụ: Sân Bóng & Cyber Game Quận 7"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Loại hình thể thao
                </label>
                <select
                  value={facilityForm.sportType}
                  onChange={(e) => setFacilityForm({ ...facilityForm, sportType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  {SPORT_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.icon} {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  required
                  value={facilityForm.address}
                  onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                  placeholder="Ví dụ: 123 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ mở cửa
                  </label>
                  <input
                    type="time"
                    value={facilityForm.openHour}
                    onChange={(e) => setFacilityForm({ ...facilityForm, openHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ đóng cửa
                  </label>
                  <input
                    type="time"
                    value={facilityForm.closeHour}
                    onChange={(e) => setFacilityForm({ ...facilityForm, closeHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFacilityModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition"
                >
                  Lưu Cơ Sở Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm Sân Con */}
      {showVenueModal && selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative">
            <button
              onClick={() => setShowVenueModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Thêm Sân Con Thuộc {selectedFacility.name}
            </h3>

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên sân con
                </label>
                <input
                  type="text"
                  required
                  value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="Ví dụ: Sân 5A, Sân 5B hoặc Phòng VIP 1"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Loại sân
                  </label>
                  <input
                    type="text"
                    value={venueForm.venueType}
                    onChange={(e) => setVenueForm({ ...venueForm, venueType: e.target.value })}
                    placeholder="Sân 5 người, Sân 7, v.v."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giá giờ chuẩn (VNĐ)
                  </label>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={venueForm.defaultPrice}
                    onChange={(e) => setVenueForm({ ...venueForm, defaultPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Peak Hour Switch */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Áp dụng giá giờ vàng (Peak Hour)
                  </span>
                  <input
                    type="checkbox"
                    checked={venueForm.hasPeakHour}
                    onChange={(e) => setVenueForm({ ...venueForm, hasPeakHour: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </div>

                {venueForm.hasPeakHour && (
                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Bắt đầu</label>
                      <input
                        type="time"
                        value={venueForm.peakStart}
                        onChange={(e) => setVenueForm({ ...venueForm, peakStart: e.target.value })}
                        className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Kết thúc</label>
                      <input
                        type="time"
                        value={venueForm.peakEnd}
                        onChange={(e) => setVenueForm({ ...venueForm, peakEnd: e.target.value })}
                        className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Giá giờ vàng</label>
                      <input
                        type="number"
                        step={10000}
                        value={venueForm.peakPrice}
                        onChange={(e) => setVenueForm({ ...venueForm, peakPrice: Number(e.target.value) })}
                        className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVenueModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  Thêm Sân Con
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
