// admin/src/app/facilities/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Edit2,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { api, Facility, Venue, PricingRule, User } from '@/lib/api';

const SPORT_TYPES = [
  { value: 'ALL', label: 'Tất cả bộ môn', icon: '🏆' },
  { value: 'FOOTBALL', label: 'Bóng đá (Sân 5 / 7 / 11)', icon: '⚽' },
  { value: 'BASKETBALL', label: 'Bóng rổ tiêu chuẩn', icon: '🏀' },
  { value: 'BADMINTON', label: 'Cầu lông Chuyên nghiệp', icon: '🏸' },
  { value: 'PICKLEBALL', label: 'Pickleball Tiêu chuẩn QT', icon: '🏓' },
  { value: 'TENNIS', label: 'Quần vợt Tennis', icon: '🎾' },
  { value: 'VOLLEYBALL', label: 'Bóng chuyền thi đấu', icon: '🏐' },
];

const COURT_SPORTS = [
  { value: 'FOOTBALL_5', label: '⚽ Bóng đá - Sân 5 người (Futsal)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ - SÂN 5', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'FOOTBALL_7', label: '⚽ Bóng đá - Sân 7 người (Mini)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ - SÂN 7', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'FOOTBALL_11', label: '⚽ Bóng đá - Sân 11 người (Tiêu chuẩn)', sport: 'FOOTBALL', badge: 'BÓNG ĐÁ - SÂN 11', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'BASKETBALL', label: '🏀 Bóng rổ tiêu chuẩn (Indoor / Outdoor)', sport: 'BASKETBALL', badge: 'BÓNG RỔ', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'BADMINTON', label: '🏸 Cầu lông thảm BWF chuyên nghiệp', sport: 'BADMINTON', badge: 'CẦU LÔNG', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'PICKLEBALL', label: '🏓 Pickleball tiêu chuẩn QT', sport: 'PICKLEBALL', badge: 'PICKLEBALL', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  { value: 'TENNIS', label: '🎾 Quần vợt Tennis (Mặt cứng / Đất nện)', sport: 'TENNIS', badge: 'QUẦN VỢT TENNIS', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { value: 'VOLLEYBALL', label: '🏐 Bóng chuyền thi đấu', sport: 'VOLLEYBALL', badge: 'BÓNG CHUYỀN', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
];

function getCourtSportBadge(venue: Venue) {
  const vType = (venue.venueType || (venue as any).type || '').toUpperCase();
  const vName = (venue.name || '').toUpperCase();

  const matched = COURT_SPORTS.find((cs) => cs.value === vType || cs.value === (venue as any).type);
  if (matched) return matched;

  if (vName.includes('FUTSAL') || vName.includes('SÂN 5') || vType.includes('FUTSAL') || vType.includes('5')) {
    return COURT_SPORTS[0];
  }
  if (vName.includes('SÂN 7') || vType.includes('7')) {
    return COURT_SPORTS[1];
  }
  if (vName.includes('SÂN 11') || vType.includes('11')) {
    return COURT_SPORTS[2];
  }
  if (vName.includes('BÓNG ĐÁ') || vType.includes('FOOTBALL')) {
    return COURT_SPORTS[0];
  }
  if (vName.includes('BÓNG RỔ') || vType.includes('BASKETBALL')) {
    return COURT_SPORTS[3];
  }
  if (vName.includes('CẦU LÔNG') || vType.includes('BADMINTON')) {
    return COURT_SPORTS[4];
  }
  if (vName.includes('PICKLEBALL') || vType.includes('PICKLEBALL')) {
    return COURT_SPORTS[5];
  }
  if (vName.includes('TENNIS') || vName.includes('QUẦN VỢT') || vType.includes('TENNIS')) {
    return COURT_SPORTS[6];
  }
  if (vName.includes('BÓNG CHUYỀN') || vType.includes('VOLLEYBALL')) {
    return COURT_SPORTS[7];
  }

  return {
    value: venue.venueType || 'SPORTS',
    label: venue.venueType || 'Sân thể thao',
    sport: 'OTHER',
    badge: venue.venueType || 'THỂ THAO',
    color: 'bg-slate-800 text-cyan-300 border-slate-700',
  };
}

export default function FacilitiesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isStaffDenied, setIsStaffDenied] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactiveVenues, setIncludeInactiveVenues] = useState(false);

  // Modals
  const [showEditFacilityModal, setShowEditFacilityModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);

  // Delete Confirm Modal State
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    hardDelete?: boolean;
    errorNote?: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
    hardDelete: false,
  });

  // Modal Purge All
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);

  // Edit Facility form
  const [editFacilityForm, setEditFacilityForm] = useState({
    _id: '',
    name: '',
    address: '',
    sportType: 'FOOTBALL_5',
    description: '',
    openHour: '06:00',
    closeHour: '23:00',
    isActive: true,
  });

  // Create Venue form
  const [venueForm, setVenueForm] = useState({
    name: '',
    venueType: 'FOOTBALL_5',
    defaultPrice: 200000,
    hasPeakHour: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    peakPrice: 300000,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    hoursBeforeForFullRefund: 24,
    hoursBeforeForNoRefund: 2,
  });

  // Edit Venue form
  const [editVenueForm, setEditVenueForm] = useState({
    _id: '',
    name: '',
    venueType: 'FOOTBALL_5',
    defaultPrice: 200000,
    hasPeakHour: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    peakPrice: 300000,
    openTime: '06:00',
    closeTime: '23:00',
    slotDurationMinutes: 60,
    hoursBeforeForFullRefund: 24,
    hoursBeforeForNoRefund: 2,
    isActive: true,
  });

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch facilities
      const facList = await api.getFacilities(true);
      if (facList.length > 0) {
        // Pick primary facility or the first one
        const primary = facList.find(f => f.name.includes('Phanta')) || facList[0];
        setFacility(primary);

        // Fetch venues for this facility
        setVenuesLoading(true);
        const venueList = await api.getVenues(primary._id, includeInactiveVenues);
        setVenues(venueList);
      } else {
        setFacility(null);
        setVenues([]);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin cơ sở và sân');
    } finally {
      setLoading(false);
      setVenuesLoading(false);
    }
  };

  useEffect(() => {
    const user = api.getUser();
    setCurrentUser(user);
    if (user?.role === 'STAFF') {
      setIsStaffDenied(true);
      router.replace('/walk-in');
      return;
    }
    loadData();
  }, [includeInactiveVenues, router]);

  // Consolidate database to single facility
  const handleConsolidate = async () => {
    try {
      setIsConsolidating(true);
      const res = await api.consolidateFacilities();
      notifySuccess(`Đã hợp nhất thành công! Cập nhật ${res.venuesUpdatedCount || 0} sân bãi và dọn dẹp ${res.deletedFacilitiesCount || 0} cơ sở dư thừa.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Lỗi hợp nhất cơ sở dữ liệu');
    } finally {
      setIsConsolidating(false);
    }
  };

  // Open Edit Facility modal
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

  // Update Facility
  const handleUpdateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateFacility(editFacilityForm._id, {
        name: editFacilityForm.name,
        address: editFacilityForm.address,
        sportType: editFacilityForm.sportType,
        sportTypes: [editFacilityForm.sportType],
        description: editFacilityForm.description,
        openHour: editFacilityForm.openHour,
        closeHour: editFacilityForm.closeHour,
        isActive: editFacilityForm.isActive,
      });
      setShowEditFacilityModal(false);
      notifySuccess(`Cập nhật thông tin cơ sở "${editFacilityForm.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật cơ sở: ' + (err.message || 'Thất bại'));
    }
  };

  // Create Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

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
        facilityId: facility._id,
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
        venueType: 'FOOTBALL_5',
        defaultPrice: 200000,
        hasPeakHour: true,
        peakStart: '17:00',
        peakEnd: '21:00',
        peakPrice: 300000,
        openTime: '06:00',
        closeTime: '23:00',
        slotDurationMinutes: 60,
        hoursBeforeForFullRefund: 24,
        hoursBeforeForNoRefund: 2,
      });
      notifySuccess(`Thêm sân "${venueForm.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi thêm sân: ' + (err.message || 'Thất bại'));
    }
  };

  // Open Edit Venue
  const openEditVenue = (venue: Venue) => {
    const peakRule = (venue.pricingConfig || (venue as any).pricingRules?.peakHours || [])[0];
    const defaultPriceVal = (venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000;
    const opHours = venue.operatingHours || { openTime: '06:00', closeTime: '23:00' };
    const cancelPol = venue.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 };

    setEditVenueForm({
      _id: venue._id,
      name: venue.name,
      venueType: venue.venueType || (venue as any).type || 'FOOTBALL_5',
      defaultPrice: defaultPriceVal,
      hasPeakHour: !!peakRule,
      peakStart: peakRule ? peakRule.startTime : '17:00',
      peakEnd: peakRule ? peakRule.endTime : '21:00',
      peakPrice: peakRule ? peakRule.price : 300000,
      openTime: opHours.openTime || '06:00',
      closeTime: opHours.closeTime || '23:00',
      slotDurationMinutes: venue.slotDurationMinutes || 60,
      hoursBeforeForFullRefund: cancelPol.hoursBeforeForFullRefund ?? 24,
      hoursBeforeForNoRefund: cancelPol.hoursBeforeForNoRefund ?? 2,
      isActive: venue.isActive !== false,
    });
    setShowEditVenueModal(true);
  };

  // Update Venue
  const handleUpdateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

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
      notifySuccess(`Cập nhật thông tin sân "${editVenueForm.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật sân: ' + (err.message || 'Thất bại'));
    }
  };

  // Delete Venue Confirmation
  const confirmDeleteVenue = (venue: Venue) => {
    setDeleteDialog({
      isOpen: true,
      id: venue._id,
      name: venue.name,
      hardDelete: false,
      errorNote: undefined,
    });
  };

  // Execute Delete Venue
  const executeDelete = async () => {
    try {
      await api.deleteVenue(deleteDialog.id, deleteDialog.hardDelete);
      notifySuccess(`Đã xóa/vô hiệu hóa sân "${deleteDialog.name}" thành công!`);
      setDeleteDialog({ ...deleteDialog, isOpen: false });
      await loadData();
    } catch (err: any) {
      const errData = err.data || {};
      if (errData.errorCode === 'VENUE_HAS_ACTIVE_BOOKINGS') {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: `Không thể xóa sân này vì đang có ${errData.activeBookingCount || ''} đơn đặt chỗ trong tương lai (trạng thái HELD hoặc CONFIRMED). Vui lòng xử lý các đơn đặt chỗ trước khi đóng sân!`,
        }));
      } else {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: err.message || 'Lỗi thực hiện thao tác xóa.',
        }));
      }
    }
  };

  // Purge All Venues
  const handlePurgeAllVenues = async () => {
    if (!facility) return;
    try {
      setPurging(true);
      await api.purgeVenues(facility._id);
      notifySuccess(`Đã dọn dẹp sạch toàn bộ sân bãi của cơ sở thành công!`);
      setShowPurgeModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa sạch sân bãi');
    } finally {
      setPurging(false);
    }
  };

  // Determine if venue belongs to courts/sports (Excluding Gym & Gaming)
  const isCourtSport = (venue: Venue) => {
    const vName = (venue.name || '').toLowerCase();
    const vType = (venue.venueType || (venue as any).type || '').toLowerCase();
    // Exclude gym and gaming (they have dedicated modules)
    if (vName.includes('cyber') || vName.includes('ps5') || vName.includes('gaming') || vName.includes('std-') || vType.includes('gaming') || vType.includes('esport')) return false;
    if (vName.includes('gym') || vName.includes('fitness') || vType.includes('gym')) return false;
    return true;
  };

  // Get sport category for filtering
  const getVenueSportCategory = (venue: Venue): string => {
    const vName = (venue.name || '').toLowerCase();
    const vType = (venue.venueType || (venue as any).type || '').toUpperCase();

    if (vType.startsWith('FOOTBALL') || vType.includes('FUTSAL') || vName.includes('bóng đá') || vName.includes('futsal') || vName.includes('sân 5') || vName.includes('sân 7') || vName.includes('sân 11')) {
      return 'FOOTBALL';
    }
    if (vType === 'BASKETBALL' || vName.includes('bóng rổ') || vName.includes('basketball')) {
      return 'BASKETBALL';
    }
    if (vType === 'BADMINTON' || vName.includes('cầu lông') || vName.includes('badminton')) {
      return 'BADMINTON';
    }
    if (vType === 'PICKLEBALL' || vName.includes('pickleball')) {
      return 'PICKLEBALL';
    }
    if (vType === 'TENNIS' || vName.includes('tennis') || vName.includes('quần vợt')) {
      return 'TENNIS';
    }
    if (vType === 'VOLLEYBALL' || vName.includes('bóng chuyền') || vName.includes('volleyball')) {
      return 'VOLLEYBALL';
    }
    return 'OTHER';
  };

  // Pure sports court venues
  const courtVenues = useMemo(() => {
    return venues.filter((v) => isCourtSport(v));
  }, [venues]);

  // Count per sport category
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: courtVenues.length };
    SPORT_TYPES.forEach((st) => {
      if (st.value !== 'ALL') {
        counts[st.value] = courtVenues.filter((v) => getVenueSportCategory(v) === st.value).length;
      }
    });
    return counts;
  }, [courtVenues]);

  // Filtered venues
  const filteredVenues = useMemo(() => {
    return courtVenues.filter((venue) => {
      // Search term
      if (searchTerm.trim() && !venue.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
        return false;
      }

      // Sport filter
      if (selectedSport !== 'ALL') {
        if (getVenueSportCategory(venue) !== selectedSport) {
          return false;
        }
      }

      return true;
    });
  }, [courtVenues, searchTerm, selectedSport]);

  const activeVenuesCount = courtVenues.filter(v => v.isActive !== false).length;

  if (isStaffDenied || currentUser?.role === 'STAFF') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mb-2">Truy Cập Bị Từ Chối</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Tài khoản Nhân viên quầy không có quyền hạn truy cập hoặc chỉnh sửa khu vực <span className="text-rose-400 font-semibold">Quản Lý Sân Bãi & Biểu Giá</span>. Đang chuyển hướng về trang làm việc...
        </p>
        <button
          onClick={() => router.replace('/walk-in')}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          Quay lại Đặt tại Quầy
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Quản Lý Sân Bãi & Biểu Giá
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-heading tabular-nums">
                  SINGLE FACILITY
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Thiết lập hệ thống sân, giá giờ tiêu chuẩn, biểu giá giờ vàng & quy chế hoạt động
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleConsolidate}
            disabled={isConsolidating}
            title="Đồng bộ toàn bộ sân và dọn dẹp các cơ sở trùng lặp trong cơ sở dữ liệu"
            className="inline-flex items-center px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-2xl text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-cyan-400 ${isConsolidating ? 'animate-spin' : ''}`} />
            <span>{isConsolidating ? 'Đang đồng bộ' : 'Đồng Bộ 1 Cơ Sở'}</span>
          </button>

          {courtVenues.length > 0 && (
            <button
              onClick={() => setShowPurgeModal(true)}
              title="Xóa toàn bộ các sân hiện tại để tự thêm sân lại từ đầu"
              className="inline-flex items-center px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl text-xs font-bold transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              <span>Xóa Tất Cả Sân ({courtVenues.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowVenueModal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + THÊM SÂN MỚI
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg backdrop-blur-md">
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
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Facility Information Banner */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
          Đang tải thông tin cơ sở Phanta Sports...
        </div>
      ) : facility ? (
        <div className="bg-gradient-to-br from-slate-900/90 via-[#0d1627]/90 to-slate-900/90 p-5 sm:p-6 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-2xl p-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                  ⚡
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {facility.name}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-heading tabular-nums font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      CƠ SỞ DUY NHẤT
                    </span>
                    {facility.isActive === false && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        TẠM ĐÓNG
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{facility.address || '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM'}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 pl-11 max-w-2xl leading-relaxed">
                {facility.description || 'Tổ hợp thể thao cao cấp tích hợp: Sân Bóng đá cỏ nhân tạo, Cầu lông thảm PVC tiêu chuẩn BWF, Pickleball, Tennis và Cyber Game VIP Lounge.'}
              </p>
            </div>

            <div className="flex items-center gap-3 lg:self-center flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              {/* Quick stats */}
              <div className="px-4 py-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-center min-w-[90px]">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Tổng số sân</span>
                <span className="text-lg font-bold text-white font-heading tabular-nums">{courtVenues.length}</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-center min-w-[90px]">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Đang mở</span>
                <span className="text-lg font-bold text-emerald-400 font-heading tabular-nums">{activeVenuesCount}</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-center min-w-[110px]">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Giờ hoạt động</span>
                <span className="text-xs font-bold text-cyan-300 font-heading tabular-nums mt-1 block">
                  {facility.openHour || '06:00'} - {facility.closeHour || '23:00'}
                </span>
              </div>

              <button
                onClick={() => openEditFacility(facility)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sửa Cơ Sở</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter and Search Bar for Venues */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Sport Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SPORT_TYPES.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedSport(st.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedSport === st.value
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{st.icon}</span>
                <span>{st.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-heading tabular-nums font-bold ${
                    selectedSport === st.value
                      ? 'bg-slate-950/30 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {sportCounts[st.value] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm sân"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              onClick={() => setIncludeInactiveVenues(!includeInactiveVenues)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                includeInactiveVenues
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {includeInactiveVenues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Hiện sân ngừng hoạt động</span>
            </button>
          </div>
        </div>

        {/* Venues Grid */}
        {venuesLoading ? (
          <div className="p-16 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
            Đang tải danh sách sân bãi...
          </div>
        ) : courtVenues.length === 0 ? (
          <div className="p-16 text-center text-slate-400 bg-gradient-to-b from-slate-900/60 to-slate-950/80 rounded-3xl border border-dashed border-cyan-500/30">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">
              🏟️
            </div>
            <p className="font-bold text-white text-lg">Hệ Thống Sân Bãi Đang Trống</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Toàn bộ các sân cũ đã được dọn sạch. Bạn có thể bắt đầu tự thêm các sân thể thao mới (Bóng đá, Bóng rổ, Cầu lông, Pickleball, Tennis, Bóng chuyền...) vào cơ sở duy nhất.
            </p>
            <button
              onClick={() => setShowVenueModal(true)}
              className="mt-5 inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              + THÊM SÂN ĐẦU TIÊN
            </button>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-slate-300 text-base">Chưa tìm thấy sân nào thuộc bộ môn này</p>
            <p className="text-xs text-slate-500 mt-1">
              Thử chọn tab &quot;Tất cả bộ môn&quot; hoặc bấm nút &quot;+ THÊM SÂN MỚI&quot; để tạo sân cho bộ môn này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVenues.map((venue) => {
              const isVenueActive = venue.isActive !== false;
              const opHours = venue.operatingHours || { openTime: '06:00', closeTime: '23:00' };
              const cancelPol = venue.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 };
              const peakRules = (venue.pricingConfig || (venue as any).pricingRules?.peakHours || []);

              return (
                <div
                  key={venue._id}
                  className={`bg-slate-900/90 p-5 rounded-3xl border backdrop-blur-md shadow-lg transition-all duration-200 relative flex flex-col justify-between ${
                    isVenueActive
                      ? 'border-slate-800/90 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'border-dashed border-rose-900/50 opacity-70 bg-slate-950/80'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base leading-snug">{venue.name}</h3>
                          {!isVenueActive && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              TẠM ĐÓNG
                            </span>
                          )}
                        </div>
                        {(() => {
                          const badgeInfo = getCourtSportBadge(venue);
                          return (
                            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-heading tabular-nums font-bold px-2 py-0.5 rounded-md border ${badgeInfo.color}`}>
                              {badgeInfo.badge}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          title="Sửa thông tin sân"
                          onClick={() => openEditVenue(venue)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Vô hiệu hóa sân"
                          onClick={() => confirmDeleteVenue(venue)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition"
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

                    {/* Operating Details */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1 font-heading tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{opHours.openTime} - {opHours.closeTime}</span>
                      </div>
                      <div className="flex items-center gap-1 font-heading tabular-nums justify-end">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Hoàn 100%: &gt;{cancelPol.hoursBeforeForFullRefund}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Details */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                        Giá giờ chuẩn:
                      </span>
                      <span className="font-heading tabular-nums font-bold text-emerald-400">
                        {((venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/h
                      </span>
                    </div>

                    {peakRules.length > 0 ? (
                      peakRules.map((rule: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-800/40"
                        >
                          <span className="text-amber-300 font-bold flex items-center gap-1 text-[11px]">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Giờ vàng ({rule.startTime} - {rule.endTime}):
                          </span>
                          <span className="font-heading tabular-nums font-bold text-amber-300 text-[11px]">
                            {(rule.price ?? 0).toLocaleString('vi-VN')} đ/h
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-1">
                        Áp dụng đồng giá mọi khung giờ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Sửa Cơ Sở Duy Nhất */}
      {showEditFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative">
            <button
              onClick={() => setShowEditFacilityModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-400" />
              Chỉnh Sửa Thông Tin Tổ Hợp Thể Thao
            </h3>

            <form onSubmit={handleUpdateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên tổ hợp cơ sở
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Mô tả / Giới thiệu
                </label>
                <textarea
                  rows={3}
                  value={editFacilityForm.description}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, description: e.target.value })}
                  placeholder="Mô tả các dịch vụ thể thao tích hợp"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-heading tabular-nums"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-heading tabular-nums"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Trạng thái hoạt động</span>
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
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Thêm Sân Mới */}
      {showVenueModal && facility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowVenueModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Thêm Sân Mới Vào Tổ Hợp
            </h3>

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên Sân Bãi
                </label>
                <input
                  type="text"
                  required
                  value={venueForm.name}
                  onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                  placeholder="Ví dụ: Sân Bóng 1 (Mini 5 người)"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Bộ Môn / Loại Sân
                </label>
                <select
                  value={venueForm.venueType}
                  onChange={(e) => setVenueForm({ ...venueForm, venueType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  {COURT_SPORTS.map((cs) => (
                    <option key={cs.value} value={cs.value} className="bg-slate-900 text-white">
                      {cs.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ mở cửa
                  </label>
                  <input
                    type="time"
                    value={venueForm.openTime}
                    onChange={(e) => setVenueForm({ ...venueForm, openTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl font-heading tabular-nums focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ đóng cửa
                  </label>
                  <input
                    type="time"
                    value={venueForm.closeTime}
                    onChange={(e) => setVenueForm({ ...venueForm, closeTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl font-heading tabular-nums focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Giá Giờ Tiêu Chuẩn (VNĐ / giờ)
                </label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={venueForm.defaultPrice}
                  onChange={(e) => setVenueForm({ ...venueForm, defaultPrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-emerald-400 font-heading tabular-nums font-bold rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              {/* Peak Hours Configuration */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase text-amber-300">Biểu Giá Giờ Vàng (Peak Hours)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={venueForm.hasPeakHour}
                    onChange={(e) => setVenueForm({ ...venueForm, hasPeakHour: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {venueForm.hasPeakHour && (
                  <div className="space-y-3 pt-2 border-t border-amber-900/40">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-200/80 mb-1">Bắt đầu</label>
                        <input
                          type="time"
                          value={venueForm.peakStart}
                          onChange={(e) => setVenueForm({ ...venueForm, peakStart: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-700/50 text-white rounded-lg font-heading tabular-nums focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-200/80 mb-1">Kết thúc</label>
                        <input
                          type="time"
                          value={venueForm.peakEnd}
                          onChange={(e) => setVenueForm({ ...venueForm, peakEnd: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-700/50 text-white rounded-lg font-heading tabular-nums focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-200/80 mb-1">Giá Giờ Vàng (VNĐ / giờ)</label>
                      <input
                        type="number"
                        step="10000"
                        value={venueForm.peakPrice}
                        onChange={(e) => setVenueForm({ ...venueForm, peakPrice: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-700/50 text-amber-300 font-heading tabular-nums font-bold rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cancellation Policy */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase text-slate-300">Chính Sách Hoàn Hủy</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Hoàn 100% nếu hủy trước (giờ):</label>
                    <input
                      type="number"
                      value={venueForm.hoursBeforeForFullRefund}
                      onChange={(e) => setVenueForm({ ...venueForm, hoursBeforeForFullRefund: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-lg font-heading tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Không hoàn nếu sát giờ &lt; (giờ):</label>
                    <input
                      type="number"
                      value={venueForm.hoursBeforeForNoRefund}
                      onChange={(e) => setVenueForm({ ...venueForm, hoursBeforeForNoRefund: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-lg font-heading tabular-nums"
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
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  Lưu Sân Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Sửa Sân */}
      {showEditVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditVenueModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-400" />
              Chỉnh Sửa Thông Tin Sân
            </h3>

            <form onSubmit={handleUpdateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tên Sân Bãi
                </label>
                <input
                  type="text"
                  required
                  value={editVenueForm.name}
                  onChange={(e) => setEditVenueForm({ ...editVenueForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Bộ Môn / Loại Sân
                </label>
                <select
                  value={editVenueForm.venueType}
                  onChange={(e) => setEditVenueForm({ ...editVenueForm, venueType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  {COURT_SPORTS.map((cs) => (
                    <option key={cs.value} value={cs.value} className="bg-slate-900 text-white">
                      {cs.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ mở cửa
                  </label>
                  <input
                    type="time"
                    value={editVenueForm.openTime}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, openTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl font-heading tabular-nums focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Giờ đóng cửa
                  </label>
                  <input
                    type="time"
                    value={editVenueForm.closeTime}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, closeTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl font-heading tabular-nums focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Giá Giờ Tiêu Chuẩn (VNĐ / giờ)
                </label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={editVenueForm.defaultPrice}
                  onChange={(e) => setEditVenueForm({ ...editVenueForm, defaultPrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-emerald-400 font-heading tabular-nums font-bold rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              {/* Peak Hours Configuration */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase text-amber-300">Biểu Giá Giờ Vàng (Peak Hours)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editVenueForm.hasPeakHour}
                    onChange={(e) => setEditVenueForm({ ...editVenueForm, hasPeakHour: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {editVenueForm.hasPeakHour && (
                  <div className="space-y-3 pt-2 border-t border-amber-900/40">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-200/80 mb-1">Bắt đầu</label>
                        <input
                          type="time"
                          value={editVenueForm.peakStart}
                          onChange={(e) => setEditVenueForm({ ...editVenueForm, peakStart: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-700/50 text-white rounded-lg font-heading tabular-nums focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-200/80 mb-1">Kết thúc</label>
                        <input
                          type="time"
                          value={editVenueForm.peakEnd}
                          onChange={(e) => setEditVenueForm({ ...editVenueForm, peakEnd: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-700/50 text-white rounded-lg font-heading tabular-nums focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-200/80 mb-1">Giá Giờ Vàng (VNĐ / giờ)</label>
                      <input
                        type="number"
                        step="10000"
                        value={editVenueForm.peakPrice}
                        onChange={(e) => setEditVenueForm({ ...editVenueForm, peakPrice: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-700/50 text-amber-300 font-heading tabular-nums font-bold rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cancellation Policy */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase text-slate-300">Chính Sách Hoàn Hủy</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Hoàn 100% nếu hủy trước (giờ):</label>
                    <input
                      type="number"
                      value={editVenueForm.hoursBeforeForFullRefund}
                      onChange={(e) => setEditVenueForm({ ...editVenueForm, hoursBeforeForFullRefund: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-lg font-heading tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Không hoàn nếu sát giờ &lt; (giờ):</label>
                    <input
                      type="number"
                      value={editVenueForm.hoursBeforeForNoRefund}
                      onChange={(e) => setEditVenueForm({ ...editVenueForm, hoursBeforeForNoRefund: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 text-white rounded-lg font-heading tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Trạng thái sân</span>
                  <span className="text-[11px] text-slate-400">Tắt để chuyển sân sang trạng thái tạm đóng</span>
                </div>
                <input
                  type="checkbox"
                  checked={editVenueForm.isActive}
                  onChange={(e) => setEditVenueForm({ ...editVenueForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
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
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-rose-400 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              Xác Nhận Xóa Sân Bãi
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa/vô hiệu hóa sân <strong className="text-white">&quot;{deleteDialog.name}&quot;</strong> không? Khách hàng sẽ không thể đặt sân này trên ứng dụng.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Xóa vĩnh viễn (Hard Delete)</span>
                <span className="text-[10px] text-slate-400">Xóa hẳn khỏi cơ sở dữ liệu thay vì ẩn</span>
              </div>
              <input
                type="checkbox"
                checked={!!deleteDialog.hardDelete}
                onChange={(e) => setDeleteDialog({ ...deleteDialog, hardDelete: e.target.checked })}
                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {deleteDialog.errorNote && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{deleteDialog.errorNote}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Đóng
              </button>
              {!deleteDialog.errorNote && (
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition"
                >
                  {deleteDialog.hardDelete ? 'Xóa Vĩnh Viễn' : 'Xác Nhận Vô Hiệu Hóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PURGE ALL VENUES CONFIRMATION */}
      {showPurgeModal && facility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <h3 className="text-base font-bold text-rose-400 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              Xác Nhận Xóa Sạch Toàn Bộ Sân Bãi
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hành động này sẽ <strong className="text-rose-400">xóa vĩnh viễn toàn bộ {courtVenues.length} sân thể thao</strong> thuộc cơ sở <strong className="text-white">&quot;{facility.name}&quot;</strong> để bạn có thể tự thêm lại hệ thống sân mới từ đầu.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>Lưu ý: Thao tác này sẽ dọn dẹp sạch sẽ danh sách sân. Bạn có thể tự thêm lại từng sân theo ý muốn ngay sau đó.</span>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={purging}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={purging}
                onClick={handlePurgeAllVenues}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purging ? 'Đang Xóa' : 'Xác Nhận Xóa Sạch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
