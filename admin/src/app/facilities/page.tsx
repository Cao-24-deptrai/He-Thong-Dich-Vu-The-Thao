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
} from 'lucide-react';
import { api, Facility, Venue, PricingRule, User } from '@/lib/api';

const SPORT_TYPES = [
  { value: 'ALL', label: 'Tất cả bộ môn' },
  { value: 'FOOTBALL', label: 'Bóng đá (Sân 5 / 7 / 11)' },
  { value: 'BASKETBALL', label: 'Bóng rổ tiêu chuẩn' },
  { value: 'BADMINTON', label: 'Cầu lông chuyên nghiệp' },
  { value: 'PICKLEBALL', label: 'Pickleball tiêu chuẩn' },
  { value: 'TENNIS', label: 'Quần vợt Tennis' },
  { value: 'VOLLEYBALL', label: 'Bóng chuyền thi đấu' },
];

const COURT_SPORTS = [
  { value: 'FOOTBALL_5', label: 'Bóng đá - Sân 5 người (Futsal)', sport: 'FOOTBALL', badge: 'Bóng đá - Sân 5' },
  { value: 'FOOTBALL_7', label: 'Bóng đá - Sân 7 người (Mini)', sport: 'FOOTBALL', badge: 'Bóng đá - Sân 7' },
  { value: 'FOOTBALL_11', label: 'Bóng đá - Sân 11 người (Tiêu chuẩn)', sport: 'FOOTBALL', badge: 'Bóng đá - Sân 11' },
  { value: 'BASKETBALL', label: 'Bóng rổ tiêu chuẩn (Trong nhà / Ngoài trời)', sport: 'BASKETBALL', badge: 'Bóng rổ' },
  { value: 'BADMINTON', label: 'Cầu lông thảm BWF chuyên nghiệp', sport: 'BADMINTON', badge: 'Cầu lông' },
  { value: 'PICKLEBALL', label: 'Pickleball tiêu chuẩn quốc tế', sport: 'PICKLEBALL', badge: 'Pickleball' },
  { value: 'TENNIS', label: 'Quần vợt Tennis (Mặt cứng / Đất nện)', sport: 'TENNIS', badge: 'Quần vợt Tennis' },
  { value: 'VOLLEYBALL', label: 'Bóng chuyền thi đấu', sport: 'VOLLEYBALL', badge: 'Bóng chuyền' },
];

function getCourtSportBadge(venue: Venue) {
  const vType = (venue.venueType || (venue as any).type || '').toUpperCase();
  const vName = (venue.name || '').toUpperCase();

  const matched = COURT_SPORTS.find((cs) => cs.value === vType || cs.value === (venue as any).type);
  if (matched) return matched;

  if (vName.includes('FUTSAL') || vName.includes('SÂN 5') || vType.includes('FUTSAL') || vType.includes('5')) return COURT_SPORTS[0];
  if (vName.includes('SÂN 7') || vType.includes('7')) return COURT_SPORTS[1];
  if (vName.includes('SÂN 11') || vType.includes('11')) return COURT_SPORTS[2];
  if (vName.includes('BÓNG ĐÁ') || vType.includes('FOOTBALL')) return COURT_SPORTS[0];
  if (vName.includes('BÓNG RỔ') || vType.includes('BASKETBALL')) return COURT_SPORTS[3];
  if (vName.includes('CẦU LÔNG') || vType.includes('BADMINTON')) return COURT_SPORTS[4];
  if (vName.includes('PICKLEBALL') || vType.includes('PICKLEBALL')) return COURT_SPORTS[5];
  if (vName.includes('TENNIS') || vName.includes('QUẦN VỢT') || vType.includes('TENNIS')) return COURT_SPORTS[6];
  if (vName.includes('BÓNG CHUYỀN') || vType.includes('VOLLEYBALL')) return COURT_SPORTS[7];

  return {
    value: venue.venueType || 'SPORTS',
    label: venue.venueType || 'Sân thể thao',
    sport: 'OTHER',
    badge: venue.venueType || 'Thể thao',
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

  const [selectedSport, setSelectedSport] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactiveVenues, setIncludeInactiveVenues] = useState(false);

  const [showEditFacilityModal, setShowEditFacilityModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);

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

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);

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
      const facList = await api.getFacilities(true);
      if (facList.length > 0) {
        const primary = facList.find((f) => f.name.includes('Phanta')) || facList[0];
        setFacility(primary);
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

  const handleConsolidate = async () => {
    try {
      setIsConsolidating(true);
      const res = await api.consolidateFacilities();
      notifySuccess(`Đã hợp nhất thành công. Cập nhật ${res.venuesUpdatedCount || 0} sân bãi và dọn dẹp ${res.deletedFacilitiesCount || 0} cơ sở dư thừa.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Lỗi hợp nhất dữ liệu cơ sở');
    } finally {
      setIsConsolidating(false);
    }
  };

  const openEditFacility = (fac: Facility) => {
    const sportTypeStr =
      fac.sportTypes && fac.sportTypes.length > 0 ? fac.sportTypes[0] : fac.sportType || 'FOOTBALL';

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
      notifySuccess(`Cập nhật thông tin cơ sở "${editFacilityForm.name}" thành công.`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật cơ sở: ' + (err.message || 'Thất bại'));
    }
  };

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
      notifySuccess(`Thêm sân "${venueForm.name}" thành công.`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi thêm sân: ' + (err.message || 'Thất bại'));
    }
  };

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
      notifySuccess(`Cập nhật thông tin sân "${editVenueForm.name}" thành công.`);
      await loadData();
    } catch (err: any) {
      alert('Lỗi cập nhật sân: ' + (err.message || 'Thất bại'));
    }
  };

  const confirmDeleteVenue = (venue: Venue) => {
    setDeleteDialog({
      isOpen: true,
      id: venue._id,
      name: venue.name,
      hardDelete: false,
      errorNote: undefined,
    });
  };

  const executeDelete = async () => {
    try {
      await api.deleteVenue(deleteDialog.id, deleteDialog.hardDelete);
      notifySuccess(`Đã xóa/vô hiệu hóa sân "${deleteDialog.name}" thành công.`);
      setDeleteDialog({ ...deleteDialog, isOpen: false });
      await loadData();
    } catch (err: any) {
      const errData = err.data || {};
      if (errData.errorCode === 'VENUE_HAS_ACTIVE_BOOKINGS') {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: `Không thể xóa sân này vì đang có ${errData.activeBookingCount || ''} đơn đặt chỗ trong tương lai. Vui lòng xử lý các đơn đặt chỗ trước khi đóng sân.`,
        }));
      } else {
        setDeleteDialog((prev) => ({
          ...prev,
          errorNote: err.message || 'Lỗi thực hiện thao tác xóa.',
        }));
      }
    }
  };

  const handlePurgeAllVenues = async () => {
    if (!facility) return;
    try {
      setPurging(true);
      await api.purgeVenues(facility._id);
      notifySuccess('Đã dọn dẹp sạch toàn bộ sân bãi của cơ sở thành công.');
      setShowPurgeModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa sạch sân bãi');
    } finally {
      setPurging(false);
    }
  };

  const isCourtSport = (venue: Venue) => {
    const vName = (venue.name || '').toLowerCase();
    const vType = (venue.venueType || (venue as any).type || '').toLowerCase();
    if (vName.includes('cyber') || vName.includes('ps5') || vName.includes('gaming') || vName.includes('std-') || vType.includes('gaming') || vType.includes('esport')) return false;
    if (vName.includes('gym') || vName.includes('fitness') || vType.includes('gym')) return false;
    return true;
  };

  const getVenueSportCategory = (venue: Venue): string => {
    const vName = (venue.name || '').toLowerCase();
    const vType = (venue.venueType || (venue as any).type || '').toUpperCase();

    if (vType.startsWith('FOOTBALL') || vType.includes('FUTSAL') || vName.includes('bóng đá') || vName.includes('futsal') || vName.includes('sân 5') || vName.includes('sân 7') || vName.includes('sân 11')) return 'FOOTBALL';
    if (vType === 'BASKETBALL' || vName.includes('bóng rổ') || vName.includes('basketball')) return 'BASKETBALL';
    if (vType === 'BADMINTON' || vName.includes('cầu lông') || vName.includes('badminton')) return 'BADMINTON';
    if (vType === 'PICKLEBALL' || vName.includes('pickleball')) return 'PICKLEBALL';
    if (vType === 'TENNIS' || vName.includes('tennis') || vName.includes('quần vợt')) return 'TENNIS';
    if (vType === 'VOLLEYBALL' || vName.includes('bóng chuyền') || vName.includes('volleyball')) return 'VOLLEYBALL';
    return 'OTHER';
  };

  const courtVenues = useMemo(() => venues.filter((v) => isCourtSport(v)), [venues]);

  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: courtVenues.length };
    SPORT_TYPES.forEach((st) => {
      if (st.value !== 'ALL') {
        counts[st.value] = courtVenues.filter((v) => getVenueSportCategory(v) === st.value).length;
      }
    });
    return counts;
  }, [courtVenues]);

  const filteredVenues = useMemo(() => {
    return courtVenues.filter((venue) => {
      if (searchTerm.trim() && !venue.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
      if (selectedSport !== 'ALL' && getVenueSportCategory(venue) !== selectedSport) return false;
      return true;
    });
  }, [courtVenues, searchTerm, selectedSport]);

  const activeVenuesCount = courtVenues.filter((v) => v.isActive !== false).length;

  if (isStaffDenied || currentUser?.role === 'STAFF') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
          <AlertCircle className="w-7 h-7" strokeWidth={1.75} />
        </div>
        <h2 className="font-heading font-semibold text-xl text-[var(--text-heading)] mb-2">Truy cập bị từ chối</h2>
        <p className="text-xs text-[var(--text-sub)] max-w-md mb-6 leading-relaxed">
          Tài khoản nhân viên quầy không có quyền truy cập khu vực Quản lý sân bãi và biểu giá.
        </p>
        <button
          type="button"
          onClick={() => router.replace('/walk-in')}
          className="phanta-btn-primary px-5 py-2.5 text-xs"
        >
          Quay lại Đặt tại quầy
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[var(--pitch-green)]" strokeWidth={1.75} />
            <span>Quản lý sân bãi & Biểu giá</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Thiết lập hệ thống sân, giá giờ tiêu chuẩn, biểu giá giờ vàng và quy chế hoạt động
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleConsolidate}
            disabled={isConsolidating}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--pitch-green)] ${isConsolidating ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            <span>{isConsolidating ? 'Đang đồng bộ' : 'Đồng bộ cơ sở'}</span>
          </button>

          {courtVenues.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Xóa tất cả sân ({courtVenues.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowVenueModal(true)}
            className="phanta-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Thêm sân mới</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Facility Banner */}
      {loading ? (
        <div className="phanta-card p-10 text-center text-xs text-[var(--text-sub)]">
          Đang tải thông tin cơ sở Phanta Sports...
        </div>
      ) : facility ? (
        <div className="phanta-card p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-2.5 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-color)] text-[var(--pitch-green)]">
                  <Building2 className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading font-semibold text-xl text-[var(--text-heading)]">
                      {facility.name}
                    </h2>
                    {facility.isActive === false && (
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30">
                        Tạm đóng
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-sub)] mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--pitch-green)] shrink-0" strokeWidth={1.75} />
                    <span>{facility.address || '30 Nguyễn Kim, Phường 6, Quận 10, TP.HCM'}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-sub)] pl-12 max-w-2xl leading-relaxed">
                {facility.description || 'Tổ hợp thể thao tích hợp sân bóng đá cỏ nhân tạo, cầu lông thảm BWF, Pickleball, Tennis và Cyber Game Lounge.'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border-subtle)]">
              <div className="phanta-subcard px-4 py-2 text-center min-w-[90px] tabular-nums">
                <span className="block text-[11px] text-[var(--text-sub)]">Tổng số sân</span>
                <span className="text-lg font-heading font-semibold text-[var(--text-heading)]">{courtVenues.length}</span>
              </div>
              <div className="phanta-subcard px-4 py-2 text-center min-w-[90px] tabular-nums">
                <span className="block text-[11px] text-[var(--text-sub)]">Đang mở</span>
                <span className="text-lg font-heading font-semibold text-[var(--pitch-green)]">{activeVenuesCount}</span>
              </div>
              <div className="phanta-subcard px-4 py-2 text-center min-w-[115px] tabular-nums">
                <span className="block text-[11px] text-[var(--text-sub)]">Giờ hoạt động</span>
                <span className="text-xs font-heading font-semibold text-[var(--text-heading)] mt-1 block">
                  {facility.openHour || '06:00'} - {facility.closeHour || '23:00'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openEditFacility(facility)}
                className="phanta-btn-secondary px-3.5 py-2.5 text-xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                <span>Sửa cơ sở</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {SPORT_TYPES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setSelectedSport(st.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-colors ${
                  selectedSport === st.value
                    ? 'bg-[var(--pitch-green)] text-[#0C0F0C] border-transparent font-semibold'
                    : 'bg-[var(--bg-card)] text-[var(--text-sub)] border-[var(--border-subtle)] hover:text-[var(--text-heading)]'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-md tabular-nums ${
                    selectedSport === st.value
                      ? 'bg-black/15 text-[#0C0F0C]'
                      : 'bg-[var(--bg-card-inner)] text-[var(--text-sub)]'
                  }`}
                >
                  {sportCounts[st.value] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-[var(--text-sub)] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm sân"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--pitch-green)]"
              />
            </div>

            <button
              type="button"
              onClick={() => setIncludeInactiveVenues(!includeInactiveVenues)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                includeInactiveVenues
                  ? 'bg-amber-500/15 text-[var(--burnt-orange)] border-amber-500/30'
                  : 'phanta-btn-secondary'
              }`}
            >
              {includeInactiveVenues ? <Eye className="w-3.5 h-3.5" strokeWidth={1.75} /> : <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} />}
              <span className="hidden sm:inline">Hiện sân ngừng hoạt động</span>
            </button>
          </div>
        </div>

        {/* Venues Grid */}
        {venuesLoading ? (
          <div className="phanta-card p-16 text-center text-xs text-[var(--text-sub)]">
            Đang tải danh sách sân bãi...
          </div>
        ) : courtVenues.length === 0 ? (
          <div className="phanta-card p-14 text-center border-dashed">
            <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-heading font-semibold text-base text-[var(--text-heading)]">Hệ thống sân bãi đang trống</p>
            <p className="text-xs text-[var(--text-sub)] mt-1 max-w-md mx-auto leading-relaxed">
              Chưa có sân thể thao nào được thiết lập. Bạn có thể bắt đầu thêm các sân mới vào cơ sở.
            </p>
            <button
              type="button"
              onClick={() => setShowVenueModal(true)}
              className="phanta-btn-primary mt-5 inline-flex items-center px-4 py-2 text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>Thêm sân đầu tiên</span>
            </button>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="phanta-card p-14 text-center border-dashed">
            <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-heading font-semibold text-base text-[var(--text-heading)]">Chưa tìm thấy sân nào thuộc bộ môn này</p>
            <p className="text-xs text-[var(--text-sub)] mt-1">
              Thử chọn mục &quot;Tất cả bộ môn&quot; hoặc bấm &quot;Thêm sân mới&quot; để tạo sân cho bộ môn này
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVenues.map((venue) => {
              const isVenueActive = venue.isActive !== false;
              const opHours = venue.operatingHours || { openTime: '06:00', closeTime: '23:00' };
              const cancelPol = venue.cancellationPolicy || { hoursBeforeForFullRefund: 24, hoursBeforeForNoRefund: 2 };
              const peakRules = venue.pricingConfig || (venue as any).pricingRules?.peakHours || [];
              const badgeInfo = getCourtSportBadge(venue);

              return (
                <div
                  key={venue._id}
                  className={`phanta-card p-5 flex flex-col justify-between transition-colors ${
                    isVenueActive ? 'phanta-card-hover' : 'opacity-70 border-dashed'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-[var(--text-heading)] text-base leading-snug">
                            {venue.name}
                          </h3>
                          {!isVenueActive && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              Tạm đóng
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-[var(--bg-card-inner)] text-[var(--text-sub)] border border-[var(--border-subtle)]">
                          <span className={`w-1.5 h-1.5 rounded-full ${isVenueActive ? 'bg-[var(--pitch-green)]' : 'bg-rose-500'}`} />
                          <span>{badgeInfo.badge}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Sửa thông tin sân"
                          onClick={() => openEditVenue(venue)}
                          className="phanta-btn-secondary p-1.5 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          title="Vô hiệu hóa sân"
                          onClick={() => confirmDeleteVenue(venue)}
                          className="phanta-btn-secondary p-1.5 rounded-lg hover:border-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2 text-xs text-[var(--text-sub)] tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--pitch-green)] shrink-0" strokeWidth={1.75} />
                        <span>{opHours.openTime} - {opHours.closeTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <RotateCcw className="w-3.5 h-3.5 text-[var(--burnt-orange)] shrink-0" strokeWidth={1.75} />
                        <span>Hoàn 100%: &gt;{cancelPol.hoursBeforeForFullRefund}h</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2 tabular-nums">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-sub)] flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Giá giờ chuẩn</span>
                      </span>
                      <span className="font-heading font-semibold text-[var(--pitch-green)]">
                        {((venue as any).defaultPrice ?? (venue as any).basePricePerHour ?? 200000).toLocaleString('vi-VN')} đ/h
                      </span>
                    </div>

                    {peakRules.length > 0 ? (
                      peakRules.map((rule: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/25"
                        >
                          <span className="text-[var(--burnt-orange)] font-medium flex items-center gap-1 text-[11px]">
                            <Sparkles className="w-3 h-3" strokeWidth={1.75} />
                            <span>Giờ vàng ({rule.startTime} - {rule.endTime})</span>
                          </span>
                          <span className="font-semibold text-[var(--burnt-orange)] text-[11px]">
                            {(rule.price ?? 0).toLocaleString('vi-VN')} đ/h
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-[var(--text-muted)] py-1">
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

      {/* MODAL 1: Sửa Cơ Sở */}
      {showEditFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="phanta-card max-w-lg w-full p-6 relative">
            <button
              type="button"
              onClick={() => setShowEditFacilityModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)] mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
              <span>Chỉnh sửa thông tin tổ hợp thể thao</span>
            </h3>

            <form onSubmit={handleUpdateFacility} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text-sub)] mb-1">Tên tổ hợp cơ sở</label>
                <input
                  type="text"
                  required
                  value={editFacilityForm.name}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text-sub)] mb-1">Địa chỉ</label>
                <input
                  type="text"
                  required
                  value={editFacilityForm.address}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text-sub)] mb-1">Mô tả / Giới thiệu</label>
                <textarea
                  rows={3}
                  value={editFacilityForm.description}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, description: e.target.value })}
                  placeholder="Mô tả các dịch vụ thể thao tích hợp"
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 tabular-nums">
                <div>
                  <label className="block font-medium text-[var(--text-sub)] mb-1">Giờ mở cửa</label>
                  <input
                    type="time"
                    value={editFacilityForm.openHour}
                    onChange={(e) => setEditFacilityForm({ ...editFacilityForm, openHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text-sub)] mb-1">Giờ đóng cửa</label>
                  <input
                    type="time"
                    value={editFacilityForm.closeHour}
                    onChange={(e) => setEditFacilityForm({ ...editFacilityForm, closeHour: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                  />
                </div>
              </div>

              <div className="phanta-subcard p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[var(--text-heading)] block">Trạng thái hoạt động</span>
                  <span className="text-[11px] text-[var(--text-sub)]">Tắt để chuyển cơ sở sang trạng thái tạm đóng</span>
                </div>
                <input
                  type="checkbox"
                  checked={editFacilityForm.isActive}
                  onChange={(e) => setEditFacilityForm({ ...editFacilityForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--pitch-green)] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowEditFacilityModal(false)}
                  className="phanta-btn-secondary px-4 py-2 text-xs"
                >
                  Hủy
                </button>
                <button type="submit" className="phanta-btn-primary px-4 py-2 text-xs">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 & 3: Thêm / Sửa Sân */}
      {(showVenueModal || showEditVenueModal) && facility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="phanta-card max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setShowVenueModal(false);
                setShowEditVenueModal(false);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-heading)]"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)] mb-4 flex items-center gap-2">
              {showEditVenueModal ? (
                <Edit2 className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
              ) : (
                <Plus className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
              )}
              <span>{showEditVenueModal ? 'Chỉnh sửa thông tin sân' : 'Thêm sân mới vào tổ hợp'}</span>
            </h3>

            {(() => {
              const isEdit = showEditVenueModal;
              const current = isEdit ? editVenueForm : venueForm;
              const setForm = (next: any) => (isEdit ? setEditVenueForm(next) : setVenueForm(next));
              return (
                <form onSubmit={isEdit ? handleUpdateVenue : handleCreateVenue} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium text-[var(--text-sub)] mb-1">Tên sân bãi</label>
                    <input
                      type="text"
                      required
                      value={current.name}
                      onChange={(e) => setForm({ ...current, name: e.target.value })}
                      placeholder="Ví dụ: Sân bóng 1 (Mini 5 người)"
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[var(--text-sub)] mb-1">Bộ môn / Loại sân</label>
                    <select
                      value={current.venueType}
                      onChange={(e) => setForm({ ...current, venueType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                    >
                      {COURT_SPORTS.map((cs) => (
                        <option key={cs.value} value={cs.value}>
                          {cs.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 tabular-nums">
                    <div>
                      <label className="block font-medium text-[var(--text-sub)] mb-1">Giờ mở cửa</label>
                      <input
                        type="time"
                        value={current.openTime}
                        onChange={(e) => setForm({ ...current, openTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[var(--text-sub)] mb-1">Giờ đóng cửa</label>
                      <input
                        type="time"
                        value={current.closeTime}
                        onChange={(e) => setForm({ ...current, closeTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-[var(--text-sub)] mb-1">Giá giờ tiêu chuẩn (VND / giờ)</label>
                    <input
                      type="number"
                      step="10000"
                      required
                      value={current.defaultPrice}
                      onChange={(e) => setForm({ ...current, defaultPrice: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--pitch-green)] font-semibold tabular-nums rounded-xl focus:outline-none focus:border-[var(--pitch-green)]"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[var(--burnt-orange)] font-medium">
                        <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                        <span>Biểu giá giờ vàng</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={current.hasPeakHour}
                        onChange={(e) => setForm({ ...current, hasPeakHour: e.target.checked })}
                        className="w-4 h-4 accent-[var(--burnt-orange)] rounded cursor-pointer"
                      />
                    </div>

                    {current.hasPeakHour && (
                      <div className="space-y-3 pt-2 border-t border-amber-500/20 tabular-nums">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-[var(--text-sub)] mb-1">Bắt đầu</label>
                            <input
                              type="time"
                              value={current.peakStart}
                              onChange={(e) => setForm({ ...current, peakStart: e.target.value })}
                              className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-[var(--text-sub)] mb-1">Kết thúc</label>
                            <input
                              type="time"
                              value={current.peakEnd}
                              onChange={(e) => setForm({ ...current, peakEnd: e.target.value })}
                              className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--text-sub)] mb-1">Giá giờ vàng (VND / giờ)</label>
                          <input
                            type="number"
                            step="10000"
                            value={current.peakPrice}
                            onChange={(e) => setForm({ ...current, peakPrice: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--burnt-orange)] font-semibold rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="phanta-subcard p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-[var(--text-heading)] font-medium">
                      <RotateCcw className="w-4 h-4 text-[var(--pitch-green)]" strokeWidth={1.75} />
                      <span>Chính sách hoàn hủy</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 tabular-nums">
                      <div>
                        <label className="block text-[11px] text-[var(--text-sub)] mb-1">Hoàn 100% trước (giờ)</label>
                        <input
                          type="number"
                          value={current.hoursBeforeForFullRefund}
                          onChange={(e) => setForm({ ...current, hoursBeforeForFullRefund: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--text-sub)] mb-1">Không hoàn nếu dưới (giờ)</label>
                        <input
                          type="number"
                          value={current.hoursBeforeForNoRefund}
                          onChange={(e) => setForm({ ...current, hoursBeforeForNoRefund: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {isEdit && (
                    <div className="phanta-subcard p-3.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[var(--text-heading)] block">Trạng thái sân</span>
                        <span className="text-[11px] text-[var(--text-sub)]">Tắt để chuyển sân sang trạng thái tạm đóng</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={editVenueForm.isActive}
                        onChange={(e) => setEditVenueForm({ ...editVenueForm, isActive: e.target.checked })}
                        className="w-4 h-4 accent-[var(--pitch-green)] rounded cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowVenueModal(false);
                        setShowEditVenueModal(false);
                      }}
                      className="phanta-btn-secondary px-4 py-2 text-xs"
                    >
                      Hủy
                    </button>
                    <button type="submit" className="phanta-btn-primary px-4 py-2 text-xs">
                      {isEdit ? 'Lưu thay đổi' : 'Lưu sân mới'}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="phanta-card max-w-md w-full p-6 space-y-4">
            <h3 className="font-heading font-semibold text-base text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" strokeWidth={1.75} />
              <span>Xác nhận xóa sân bãi</span>
            </h3>

            <p className="text-xs text-[var(--text-main)] leading-relaxed">
              Bạn có chắc chắn muốn xóa hoặc vô hiệu hóa sân <strong>&quot;{deleteDialog.name}&quot;</strong> không? Khách hàng sẽ không thể đặt sân này trên ứng dụng.
            </p>

            <div className="phanta-subcard p-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[var(--text-heading)] block">Xóa vĩnh viễn</span>
                <span className="text-[11px] text-[var(--text-sub)]">Xóa hẳn khỏi cơ sở dữ liệu thay vì ẩn tạm thời</span>
              </div>
              <input
                type="checkbox"
                checked={!!deleteDialog.hardDelete}
                onChange={(e) => setDeleteDialog({ ...deleteDialog, hardDelete: e.target.checked })}
                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {deleteDialog.errorNote && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{deleteDialog.errorNote}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
                className="phanta-btn-secondary px-4 py-2 text-xs"
              >
                Đóng
              </button>
              {!deleteDialog.errorNote && (
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {deleteDialog.hardDelete ? 'Xóa vĩnh viễn' : 'Xác nhận vô hiệu hóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PURGE ALL MODAL */}
      {showPurgeModal && facility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="phanta-card max-w-md w-full p-6 space-y-4 border-rose-500/40">
            <h3 className="font-heading font-semibold text-base text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" strokeWidth={1.75} />
              <span>Xác nhận xóa toàn bộ sân bãi</span>
            </h3>

            <p className="text-xs text-[var(--text-main)] leading-relaxed">
              Hành động này sẽ <strong className="text-rose-500">xóa vĩnh viễn toàn bộ {courtVenues.length} sân thể thao</strong> thuộc cơ sở <strong>&quot;{facility.name}&quot;</strong> để thiết lập lại từ đầu.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[var(--burnt-orange)] text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>Lưu ý: Thao tác này sẽ dọn sạch danh sách sân hiện tại. Bạn có thể tự thêm lại từng sân ngay sau đó.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={purging}
                onClick={() => setShowPurgeModal(false)}
                className="phanta-btn-secondary px-4 py-2 text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={purging}
                onClick={handlePurgeAllVenues}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{purging ? 'Đang xóa' : 'Xác nhận xóa sạch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
