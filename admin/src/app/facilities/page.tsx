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
  ArrowRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inactive toggles
  const [includeInactiveFacilities, setIncludeInactiveFacilities] = useState(false);
  const [includeInactiveVenues, setIncludeInactiveVenues] = useState(false);

  // Modals
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showEditFacilityModal, setShowEditFacilityModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);

  // Delete Confirm Modal State
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'FACILITY' | 'VENUE';
    id: string;
    name: string;
    errorNote?: string;
  }>({
    isOpen: false,
    type: 'FACILITY',
    id: '',
    name: '',
  });

  // Create Facility form
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    address: '',
    sportType: 'FOOTBALL',
    description: '',
    openHour: '06:00',
    closeHour: '23:00',
  });

  // Edit Facility form
  const [editFacilityForm, setEditFacilityForm] = useState({
    _id: '',
    name: '',
    address: '',
    sportType: 'FOOTBALL',
    description: '',
    openHour: '06:00',
    closeHour: '23:00',
    isActive: true,
  });

  // Create Venue form
  const [venueForm, setVenueForm] = useState({
    name: '',
    venueType: 'Standard',
    defaultPrice: 200000,
    hasPeakHour: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    peakPrice: 300000,
    openTime: '06:00',
    closeTime: '22:00',
    slotDurationMinutes: 60,
    hoursBeforeForFullRefund: 24,
    hoursBeforeForNoRefund: 2,
  });

  // Edit Venue form
  const [editVenueForm, setEditVenueForm] = useState({
    _id: '',
    name: '',
    venueType: 'Standard',
    defaultPrice: 200000,
    hasPeakHour: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    peakPrice: 300000,
    openTime: '06:00',
    closeTime: '22:00',
    slotDurationMinutes: 60,
    hoursBeforeForFullRefund: 24,
    hoursBeforeForNoRefund: 2,
    isActive: true,
  });

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFacilities(includeInactiveFacilities);
      setFacilities(data);
      if (data.length > 0) {
        if (!selectedFacility || !data.some((f) => f._id === selectedFacility._id)) {
          setSelectedFacility(data[0]);
        }
      } else {
        setSelectedFacility(null);
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
      const data = await api.getVenues(facilityId, includeInactiveVenues);
      setVenues(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setVenuesLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [includeInactiveFacilities]);

  useEffect(() => {
    if (selectedFacility) {
      fetchVenues(selectedFacility._id);
    } else {
      setVenues([]);
    }
  }, [selectedFacility, includeInactiveVenues]);

  // 1. Thêm Cơ Sở Mới
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFacility({
        name: facilityForm.name,
        address: facilityForm.address,
        sportType: facilityForm.sportType,
        sportTypes: [facilityForm.sportType],
        description: facilityForm.description,
      } as any);
      setShowFacilityModal(false);
      setFacilityForm({
        name: '',
        address: '',
        sportType: 'FOOTBALL',
        description: '',
        openHour: '06:00',
        closeHour: '23:00',
      });
      notifySuccess('Thêm cơ sở thể thao thành công!');
      await fetchFacilities();
    } catch (err: any) {
      alert('Lỗi tạo cơ sở: ' + (err.message || 'Thất bại'));
    }
  };

  // 2. Mở Modal Sửa Cơ Sở
  const openEditFacility = (fac: Facility) => {
    const sportTypeStr = (fac.sportTypes && fac.sportTypes.length > 0)
      ? fac.sportTypes[0]
      : (fac.sportType || 'FOOTBALL');

    setEditFacilityForm({
      _id: fac._id,
      name: fac.name,
      address: fac.address,
      sportType: sportTypeStr,
      description: fac.description || '',
      openHour: fac.openHour || '06:00',
      closeHour: fac.closeHour || '23:00',
      isActive: fac.isActive !== false,
    });
    setShowEditFacilityModal(true);
  };

  // 3. Cập Nhật Cơ Sở
  const handleUpdateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateFacility(editFacilityForm._id, {
        name: editFacilityForm.name,
        address: editFacilityForm.address,
        sportType: editFacilityForm.sportType,
        sportTypes: [editFacilityForm.sportType],
        description: editFacilityForm.description,
        isActive: editFacilityForm.isActive,
      });
      setShowEditFacilityModal(false);
      notifySuccess(`Cập nhật cơ sở "${editFacilityForm.name}" thành công!`);
      await fetchFacilities();
    } catch (err: any) {
      alert('Lỗi cập nhật cơ sở: ' + (err.message || 'Thất bại'));
    }
  };

  // 4. Xóa / Vô hiệu hóa Cơ Sở (Soft Delete)
  const confirmDeleteFacility = (fac: Facility) => {
    setDeleteDialog({
      isOpen: true,
      type: 'FACILITY',
      id: fac._id,
      name: fac.name,
      errorNote: undefined,
    });
  };

  // 5. Thêm Sân Con Mới
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
        operatingHours: {
          openTime: venueForm.openTime,
          closeTime: venueForm.closeTime,
        },
        slotDurationMinutes: Number(venueForm.slotDurationMinutes) || 60,
        cancellationPolicy: {
          hoursBeforeForFullRefund: Number(venueForm.hoursBeforeForFullRefund) || 24,
          hoursBeforeForNoRefund: Number(venueForm.hoursBeforeForNoRefund) || 2,
        },
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
        openTime: '06:00',
        closeTime: '22:00',
        slotDurationMinutes: 60,
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      });
      notifySuccess(`Thêm sân con mới vào cơ sở thành công!`);
      await fetchVenues(selectedFacility._id);
    } catch (err: any) {
      alert('Lỗi thêm sân: ' + (err.message || 'Thất bại'));
    }
  };

  // 6. Mở Modal Sửa Sân Con
  const openEditVenue = (venue: Venue) => {
    const peakRule = (venue.pricingConfig || (venue as any).pricingRules?.peakHours || [])[0];
    const defaultPriceVal = (venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000;
    const opHours = venue.operatingHours || { openTime: '06:00', closeTime: '22:00' };
    const cancelPol = venue.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 };

    setEditVenueForm({
      _id: venue._id,
      name: venue.name,
      venueType: venue.venueType || 'Standard',
      defaultPrice: defaultPriceVal,
      hasPeakHour: !!peakRule,
      peakStart: peakRule ? peakRule.startTime : '17:00',
      peakEnd: peakRule ? peakRule.endTime : '21:00',
      peakPrice: peakRule ? peakRule.price : 300000,
      openTime: opHours.openTime || '06:00',
      closeTime: opHours.closeTime || '22:00',
      slotDurationMinutes: venue.slotDurationMinutes || 60,
      hoursBeforeForFullRefund: cancelPol.hoursBeforeForFullRefund ?? 24,
      hoursBeforeForNoRefund: cancelPol.hoursBeforeForNoRefund ?? 2,
      isActive: venue.isActive !== false,
    });
    setShowEditVenueModal(true);
  };

  // 7. Cập Nhật Sân Con
  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;

    try {
      const pricingConfig: PricingRule[] = [];
      if (editVenueForm.hasPeakHour) {
        pricingConfig.push({
          startTime: editVenueForm.peakStart,
          endTime: editVenueForm.peakEnd,
          price: Number(editVenueForm.peakPrice),
        });
      }

      await api.updateVenue(editVenueForm._id, {
        name: editVenueForm.name,
        venueType: editVenueForm.venueType,
        defaultPrice: Number(editVenueForm.defaultPrice),
        pricingConfig,
        operatingHours: {
          openTime: editVenueForm.openTime,
          closeTime: editVenueForm.closeTime,
        },
        slotDurationMinutes: Number(editVenueForm.slotDurationMinutes) || 60,
        cancellationPolicy: {
          hoursBeforeForFullRefund: Number(editVenueForm.hoursBeforeForFullRefund) || 24,
          hoursBeforeForNoRefund: Number(editVenueForm.hoursBeforeForNoRefund) || 2,
        },
        isActive: editVenueForm.isActive,
      });

      setShowEditVenueModal(false);
      notifySuccess(`Cập nhật sân con "${editVenueForm.name}" thành công!`);
      await fetchVenues(selectedFacility._id);
    } catch (err: any) {
      alert('Lỗi cập nhật sân: ' + (err.message || 'Thất bại'));
    }
  };

  // 8. Xóa / Vô hiệu hóa Sân Con (Soft Delete)
  const confirmDeleteVenue = (venue: Venue) => {
    setDeleteDialog({
      isOpen: true,
      type: 'VENUE',
      id: venue._id,
      name: venue.name,
      errorNote: undefined,
    });
  };

  // Thực hiện Xóa sau khi xác nhận (Handling blocking constraints)
  const executeDelete = async () => {
    try {
      if (deleteDialog.type === 'FACILITY') {
        await api.deleteFacility(deleteDialog.id);
        notifySuccess(`Đã vô hiệu hóa cơ sở "${deleteDialog.name}" thành công!`);
        setDeleteDialog({ ...deleteDialog, isOpen: false });
        await fetchFacilities();
      } else {
        await api.deleteVenue(deleteDialog.id);
        notifySuccess(`Đã vô hiệu hóa sân con "${deleteDialog.name}" thành công!`);
        setDeleteDialog({ ...deleteDialog, isOpen: false });
        if (selectedFacility) {
          await fetchVenues(selectedFacility._id);
        }
      }
    } catch (err: any) {
      const errData = err.data || {};
      if (errData.errorCode === 'FACILITY_HAS_ACTIVE_VENUES') {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: `Không thể vô hiệu hóa cơ sở này vì vẫn còn ${errData.activeVenuesCount || ''} sân con đang hoạt động (isActive = true). Vui lòng vô hiệu hóa tất cả các sân con trước!`,
        }));
      } else if (errData.errorCode === 'VENUE_HAS_ACTIVE_BOOKINGS') {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: `Không thể vô hiệu hóa sân này vì đang có ${errData.activeBookingCount || ''} đơn đặt chỗ trong tương lai (trạng thái HELD hoặc CONFIRMED). Vui lòng chờ khách hoàn tất hoặc hủy các đơn này trước!`,
        }));
      } else {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: err.message || 'Lỗi thực hiện thao tác xóa.',
        }));
      }
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
                  FULL CRUD
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập, thêm/sửa/xóa cơ sở thể thao, hệ thống sân con, giờ hoạt động & biểu giá giờ vàng
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

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-bold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
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

            <button
              onClick={() => setIncludeInactiveFacilities(!includeInactiveFacilities)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                includeInactiveFacilities
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {includeInactiveFacilities ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Hiện đã đóng</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800 backdrop-blur-md">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
              Đang tải danh sách cơ sở...
            </div>
          ) : facilities.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
              Chưa có cơ sở nào. Bấm &quot;+ Thêm Cơ Sở Mới&quot; để bắt đầu.
            </div>
          ) : (
            <div className="space-y-3">
              {facilities.map((fac) => {
                const sportTypeStr = (fac.sportTypes && fac.sportTypes.length > 0)
                  ? fac.sportTypes[0]
                  : (fac.sportType || 'FOOTBALL');
                const matchedSport = SPORT_TYPES.find(
                  (s) => s.value.toUpperCase() === String(sportTypeStr).toUpperCase()
                );
                const sport = matchedSport || {
                  value: sportTypeStr,
                  label: sportTypeStr ? `${sportTypeStr} Thể thao` : 'Thể thao',
                  icon: '🏅',
                };
                const sportLabel = sport.label || 'Thể thao';
                const isSelected = selectedFacility?._id === fac._id;
                const isActive = fac.isActive !== false;

                return (
                  <div
                    key={fac._id}
                    onClick={() => setSelectedFacility(fac)}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 backdrop-blur-md group relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                    } ${!isActive ? 'opacity-65 border-dashed border-rose-900/40' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <span className="text-2xl p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-inner">
                          {sport.icon || '🏅'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-white text-base leading-snug">{fac.name}</h3>
                            {!isActive && (
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ĐÃ ĐÓNG
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                            <span className="truncate max-w-[180px]">{fac.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {sportLabel.split(' ')[0]}
                        </span>
                        {/* Facility Quick Actions */}
                        <div className="flex items-center gap-1 pl-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Sửa cơ sở"
                            onClick={() => openEditFacility(fac)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Xóa / Vô hiệu hóa cơ sở"
                            onClick={() => confirmDeleteFacility(fac)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
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
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    Sân thuộc: <span className="text-cyan-400">{selectedFacility.name}</span>
                    {selectedFacility.isActive === false && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Cơ sở đã ngừng hoạt động
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quản lý danh sách sân con, biểu giá thường, giờ vàng (Peak hours) & chính sách hủy
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIncludeInactiveVenues(!includeInactiveVenues)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                      includeInactiveVenues
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {includeInactiveVenues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>Sân đã đóng</span>
                  </button>

                  <button
                    onClick={() => setShowVenueModal(true)}
                    className="inline-flex items-center px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-2xl text-xs font-black hover:from-emerald-700 hover:to-teal-600 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    + Thêm Sân Con
                  </button>
                </div>
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
                  {venues.map((venue) => {
                    const isVenueActive = venue.isActive !== false;
                    const opHours = venue.operatingHours || { openTime: '06:00', closeTime: '22:00' };
                    const cancelPol = venue.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 };

                    return (
                      <div
                        key={venue._id}
                        className={`bg-slate-900/90 p-5 rounded-3xl border backdrop-blur-md shadow-lg transition relative ${
                          isVenueActive
                            ? 'border-slate-800/90 hover:border-cyan-500/40'
                            : 'border-dashed border-rose-900/50 opacity-70 bg-slate-950/80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-white text-base">{venue.name}</h3>
                              {!isVenueActive && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  NGỪNG HOẠT ĐỘNG
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                              {venue.venueType || 'Tiêu chuẩn'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Venue Actions */}
                            <button
                              title="Sửa sân con"
                              onClick={() => openEditVenue(venue)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Xóa / Vô hiệu hóa sân"
                              onClick={() => confirmDeleteVenue(venue)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span
                              className={`w-2.5 h-2.5 rounded-full ml-1 ring-4 ${
                                isVenueActive
                                  ? 'bg-emerald-400 ring-emerald-500/20 shadow-[0_0_8px_#10b981]'
                                  : 'bg-rose-500 ring-rose-500/20'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Timing and Policy Details */}
                        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{opHours.openTime} - {opHours.closeTime}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono justify-end">
                            <RotateCcw className="w-3 h-3 text-amber-400" />
                            <span>Hoàn 100%: &gt;{cancelPol.hoursBeforeForFullRefund}h</span>
                          </div>
                        </div>

                        {/* Pricing Information */}
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
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
                    );
                  })}
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

      {/* MODAL 1: Thêm Cơ Sở Mới */}
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

      {/* MODAL 2: Sửa Cơ Sở (Edit Facility) */}
      {showEditFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative">
            <button
              onClick={() => setShowEditFacilityModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-400" />
              Chỉnh Sửa Thông Tin Cơ Sở
            </h3>

            <form onSubmit={handleUpdateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên cơ sở
                </label>
                <input
                  type="text"
                  required
                  value={editFacilityForm.name}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Loại hình thể thao
                </label>
                <select
                  value={editFacilityForm.sportType}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, sportType: e.target.value })}
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
                  value={editFacilityForm.address}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, address: e.target.value })}
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
                    value={editFacilityForm.openHour}
                    onChange={(e) => setEditFacilityForm({ ...editFacilityForm, openHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ đóng cửa
                  </label>
                  <input
                    type="time"
                    value={editFacilityForm.closeHour}
                    onChange={(e) => setEditFacilityForm({ ...editFacilityForm, closeHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Trạng thái hoạt động (Kích hoạt)</span>
                  <span className="text-[11px] text-slate-400">Tắt để chuyển cơ sở sang trạng thái tạm đóng</span>
                </div>
                <input
                  type="checkbox"
                  checked={editFacilityForm.isActive}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditFacilityModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Thêm Sân Con Mới */}
      {showVenueModal && selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
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

              {/* Operating Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ mở cửa sân
                  </label>
                  <input
                    type="time"
                    value={venueForm.openTime}
                    onChange={(e) => setVenueForm({ ...venueForm, openTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ đóng cửa sân
                  </label>
                  <input
                    type="time"
                    value={venueForm.closeTime}
                    onChange={(e) => setVenueForm({ ...venueForm, closeTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl font-mono"
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
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
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

              {/* Cancellation Policy */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  Chính sách hoàn tiền khi hủy đơn
                </span>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Hoàn 100% trước (giờ):</label>
                    <input
                      type="number"
                      value={venueForm.hoursBeforeForFullRefund}
                      onChange={(e) => setVenueForm({ ...venueForm, hoursBeforeForFullRefund: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Không hoàn tiền trước (giờ):</label>
                    <input
                      type="number"
                      value={venueForm.hoursBeforeForNoRefund}
                      onChange={(e) => setVenueForm({ ...venueForm, hoursBeforeForNoRefund: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                    />
                  </div>
                </div>
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

      {/* MODAL 4: Sửa Sân Con (Edit Venue) */}
      {showEditVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditVenueModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-400" />
              Chỉnh Sửa Sân Con
            </h3>

            <form onSubmit={handleUpdateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên sân con
                </label>
                <input
                  type="text"
                  required
                  value={editVenueForm.name}
                  onChange={(e) => setEditVenueForm({ ...editVenueForm, name: e.target.value })}
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
                    value={editVenueForm.venueType}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, venueType: e.target.value })}
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
                    value={editVenueForm.defaultPrice}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, defaultPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ mở cửa sân
                  </label>
                  <input
                    type="time"
                    value={editVenueForm.openTime}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, openTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ đóng cửa sân
                  </label>
                  <input
                    type="time"
                    value={editVenueForm.closeTime}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, closeTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 text-white rounded-xl font-mono"
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
                    checked={editVenueForm.hasPeakHour}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, hasPeakHour: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {editVenueForm.hasPeakHour && (
                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Bắt đầu</label>
                      <input
                        type="time"
                        value={editVenueForm.peakStart}
                        onChange={(e) => setEditVenueForm({ ...editVenueForm, peakStart: e.target.value })}
                        className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Kết thúc</label>
                      <input
                        type="time"
                        value={editVenueForm.peakEnd}
                        onChange={(e) => setEditVenueForm({ ...editVenueForm, peakEnd: e.target.value })}
                        className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1">Giá giờ vàng</label>
                      <input
                        type="number"
                        step={10000}
                        value={editVenueForm.peakPrice}
                        onChange={(e) => setEditVenueForm({ ...editVenueForm, peakPrice: Number(e.target.value) })}
                        className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cancellation Policy */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  Chính sách hoàn tiền khi hủy đơn
                </span>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Hoàn 100% trước (giờ):</label>
                    <input
                      type="number"
                      value={editVenueForm.hoursBeforeForFullRefund}
                      onChange={(e) => setEditVenueForm({ ...editVenueForm, hoursBeforeForFullRefund: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Không hoàn tiền trước (giờ):</label>
                    <input
                      type="number"
                      value={editVenueForm.hoursBeforeForNoRefund}
                      onChange={(e) => setEditVenueForm({ ...editVenueForm, hoursBeforeForNoRefund: Number(e.target.value) })}
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-700 text-white rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Trạng thái sân hoạt động</span>
                  <span className="text-[11px] text-slate-400">Tắt để vô hiệu hóa sân (khách không đặt được)</span>
                </div>
                <input
                  type="checkbox"
                  checked={editVenueForm.isActive}
                  onChange={(e) => setEditVenueForm({ ...editVenueForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditVenueModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION / CONSTRAINT ERROR DIALOG */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setDeleteDialog({ ...deleteDialog, isOpen: false, errorNote: undefined })}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {deleteDialog.type === 'FACILITY' ? 'Vô Hiệu Hóa Cơ Sở' : 'Vô Hiệu Hóa Sân Con'}
                </h3>
                <p className="text-xs text-slate-400">Hành động bảo vệ dữ liệu (Soft-delete)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn vô hiệu hóa {deleteDialog.type === 'FACILITY' ? 'cơ sở' : 'sân'}{' '}
              <strong className="text-white">&quot;{deleteDialog.name}&quot;</strong>? Khi bị vô hiệu hóa, khách hàng sẽ không thể nhìn thấy hoặc đặt lịch trên sân này.
            </p>

            {/* Error / Blocking Constraint Note */}
            {deleteDialog.errorNote && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="leading-relaxed font-medium">
                  {deleteDialog.errorNote}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteDialog({ ...deleteDialog, isOpen: false, errorNote: undefined })}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Đóng
              </button>
              {!deleteDialog.errorNote && (
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 active:scale-95 transition"
                >
                  Xác Nhận Vô Hiệu Hóa
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
