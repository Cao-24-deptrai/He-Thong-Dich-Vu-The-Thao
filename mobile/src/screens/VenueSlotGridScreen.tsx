import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Star, X, ChevronRight, Tag } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { Venue, SlotAvailability } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { subscribeSlotChanges } from '../socket/socket';
import { PitchMap2D } from '../components/PitchMap2D';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
  onProceedPayment: () => void;
  onOpenVouchers?: () => void;
}

interface EquipmentItem {
  _id: string;
  name: string;
  depositAmount?: number;
  rentalFee?: number;
}

const isPeakSlot = (startTime: string) => parseInt(startTime.split(':')[0], 10) >= 17;

type SportFilterKey =
  | 'ALL'
  | 'FOOTBALL'
  | 'BASKETBALL'
  | 'VOLLEYBALL'
  | 'BADMINTON'
  | 'PICKLEBALL'
  | 'TENNIS'
  | 'GAMING'
  | 'GYM';

const SPORT_CATEGORIES: { key: SportFilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FOOTBALL', label: 'Bóng đá' },
  { key: 'BASKETBALL', label: 'Bóng rổ' },
  { key: 'VOLLEYBALL', label: 'Bóng chuyền' },
  { key: 'BADMINTON', label: 'Cầu lông' },
  { key: 'PICKLEBALL', label: 'Pickleball' },
  { key: 'TENNIS', label: 'Tennis' },
  { key: 'GAMING', label: 'Phòng máy' },
  { key: 'GYM', label: 'Phòng gym' },
];

const SPORT_LABELS: Record<SportFilterKey | 'OTHER', string> = {
  ALL: 'Tất cả',
  FOOTBALL: 'Bóng đá',
  BASKETBALL: 'Bóng rổ',
  VOLLEYBALL: 'Bóng chuyền',
  BADMINTON: 'Cầu lông',
  PICKLEBALL: 'Pickleball',
  TENNIS: 'Tennis',
  GAMING: 'Phòng máy',
  GYM: 'Phòng gym',
  OTHER: 'Khác',
};

const detectVenueSport = (venue: Venue): SportFilterKey | 'OTHER' => {
  const raw = `${venue.type || ''} ${venue.venueType || ''} ${venue.name || ''}`.toLowerCase();
  if (
    raw.includes('phòng máy') ||
    raw.includes('gaming') ||
    raw.includes('esport') ||
    raw.includes('cyber') ||
    raw.includes('pc')
  ) {
    return 'GAMING';
  }
  if (
    raw.includes('phòng gym') ||
    raw.includes('gym') ||
    raw.includes('fitness') ||
    raw.includes('yoga') ||
    raw.includes('pilates')
  ) {
    return 'GYM';
  }
  if (
    raw.includes('bóng đá') ||
    raw.includes('football') ||
    raw.includes('soccer') ||
    raw.includes('futsal') ||
    raw.includes('sân 5') ||
    raw.includes('sân 7') ||
    raw.includes('sân 11') ||
    raw.includes('pitch')
  ) {
    return 'FOOTBALL';
  }
  if (raw.includes('bóng rổ') || raw.includes('basketball') || raw.includes('3x3')) {
    return 'BASKETBALL';
  }
  if (raw.includes('bóng chuyền') || raw.includes('volleyball')) {
    return 'VOLLEYBALL';
  }
  if (raw.includes('cầu lông') || raw.includes('badminton')) {
    return 'BADMINTON';
  }
  if (raw.includes('pickleball')) {
    return 'PICKLEBALL';
  }
  if (raw.includes('tennis')) {
    return 'TENNIS';
  }
  return 'OTHER';
};

export const VenueSlotGridScreen: React.FC<Props> = ({
  onBack,
  onProceedPayment,
  onOpenVouchers,
}) => {
  const theme = useTheme();
  const {
    selectedFacility,
    setSelectedFacility,
    setSelectedVenue,
    selectedVenue,
    selectedDate,
    setSelectedDate,
    setActiveBooking,
    appliedVoucher,
    voucherDiscount,
    setAppliedVoucher,
  } = useBookingStore();

  const [viewMode, setViewMode] = useState<'2D' | 'LIST'>('LIST');
  const [selectedSport, setSelectedSport] = useState<SportFilterKey>('ALL');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [selectedSlotTimes, setSelectedSlotTimes] = useState<string[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [holding, setHolding] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const dateOptions = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = i === 0 ? 'Hôm nay' : dayLabels[d.getDay()];
    return {
      dateStr,
      dayName,
      dayNumber: String(d.getDate()).padStart(2, '0'),
    };
  });

  useEffect(() => {
    const ensureFacility = async () => {
      if (selectedFacility) return;
      try {
        setLoadingVenues(true);
        const list = await api.getFacilities();
        if (list.length > 0) {
          setSelectedFacility(list[0]);
        } else {
          setLoadingVenues(false);
        }
      } catch (err) {
        console.error('Failed to load default facility:', err);
        setLoadingVenues(false);
      }
    };
    ensureFacility();
  }, [selectedFacility]);

  useEffect(() => {
    if (!selectedFacility) return;
    const loadVenues = async () => {
      try {
        setLoadingVenues(true);
        const data = await api.getVenues(selectedFacility._id);
        setVenues(data);
        if (data.length > 0 && (!selectedVenue || selectedVenue.facilityId !== selectedFacility._id)) {
          setSelectedVenue(data[0]);
        }
      } catch (err) {
        console.error('Failed to load venues:', err);
        setVenues([]);
      } finally {
        setLoadingVenues(false);
      }
    };
    loadVenues();
  }, [selectedFacility]);

  useEffect(() => {
    api
      .getEquipments()
      .then((list) => setEquipments(Array.isArray(list) ? list : []))
      .catch(() => setEquipments([]));
  }, []);

  useEffect(() => {
    if (!selectedVenue || !selectedDate) return;
    const loadAvailability = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlotTimes([]);
        const res = await api.getVenueAvailability(selectedVenue._id, selectedDate);
        setSlots(res.slots || []);
      } catch (err) {
        console.error('Failed to load availability:', err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadAvailability();
  }, [selectedVenue, selectedDate]);

  useEffect(() => {
    const unsubscribe = subscribeSlotChanges((data) => {
      if (
        selectedVenue &&
        data.venueId === selectedVenue._id &&
        data.bookingDate === selectedDate
      ) {
        setSlots((prevSlots) =>
          prevSlots.map((s) =>
            s.startTime === data.startTime
              ? {
                  ...s,
                  status: data.status as SlotAvailability['status'],
                  holdExpiresAt: data.holdExpiresAt,
                }
              : s
          )
        );
      }
    });
    return unsubscribe;
  }, [selectedVenue, selectedDate]);

  const toggleSlot = (slot: SlotAvailability) => {
    if (slot.status === 'CONFIRMED' || slot.status === 'HELD' || slot.status === 'PAST') return;
    setSelectedSlotTimes((prev) =>
      prev.includes(slot.startTime)
        ? prev.filter((t) => t !== slot.startTime)
        : [...prev, slot.startTime].sort()
    );
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredVenues =
    selectedSport === 'ALL'
      ? venues
      : venues.filter((v) => detectVenueSport(v) === selectedSport);

  useEffect(() => {
    if (filteredVenues.length === 0) return;
    if (!selectedVenue || !filteredVenues.some((v) => v._id === selectedVenue._id)) {
      setSelectedVenue(filteredVenues[0]);
    }
  }, [selectedSport, venues]);

  const selectedSlotObjs = slots.filter((s) => selectedSlotTimes.includes(s.startTime));
  const fieldSubtotal = selectedSlotObjs.reduce((sum, s) => sum + s.price, 0);
  const equipSubtotal = equipments
    .filter((e) => selectedEquipmentIds.includes(e._id))
    .reduce((sum, e) => sum + (e.rentalFee ?? e.depositAmount ?? 0), 0);
  const voucherAmount = appliedVoucher ? voucherDiscount : 0;
  const totalPayable = Math.max(0, fieldSubtotal + equipSubtotal - voucherAmount);

  const handleConfirmHold = async (method: 'VIETQR' | 'WALLET') => {
    if (!selectedVenue) {
      setDialog({ visible: true, title: 'Chưa chọn sân', message: 'Vui lòng chọn sân thi đấu.' });
      return;
    }
    if (selectedSlotObjs.length === 0) {
      setDialog({
        visible: true,
        title: 'Chưa chọn khung giờ',
        message: 'Vui lòng chọn ít nhất 1 khung giờ trống để giữ chỗ.',
      });
      return;
    }

    try {
      setHolding(true);
      const first = selectedSlotObjs[0];
      const last = selectedSlotObjs[selectedSlotObjs.length - 1];
      const booking = await api.holdSlot({
        venueId: selectedVenue._id,
        bookingDate: selectedDate || dateOptions[0].dateStr,
        startTime: first.startTime,
        endTime: last.endTime,
      });
      setActiveBooking(booking);

      if (method === 'WALLET') {
        await api.payWithWallet({
          amount: booking.totalPrice,
          category: 'COURT',
          refType: 'BOOKING',
          refId: booking._id,
          note: `Thanh toán đặt sân ${selectedVenue.name}`,
        });
      }
      onProceedPayment();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể giữ chỗ khung giờ này.';
      setDialog({ visible: true, title: 'Không thể giữ chỗ', message: msg });
    } finally {
      setHolding(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={selectedFacility?.name || 'Đặt sân và ma trận 30 phút'}
        onBack={onBack}
        backIcon="close"
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Quy tắc đặt sân',
                message:
                  'Mỗi khung dài 30 phút. Hệ thống khóa giữ chỗ trong 10 phút để thanh toán qua VietQR hoặc Ví Phanta Pay.',
              })
            }
            style={styles.ruleBtn}
          >
            <Text style={[styles.ruleBtnText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              Quy định
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Venue Selector + 2D Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionTop}>
            <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
              Chọn sân thi đấu
            </Text>
            <View style={[styles.modeSwitch, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <Pressable
                onPress={() => setViewMode('LIST')}
                style={[styles.modePill, viewMode === 'LIST' && { backgroundColor: theme.accent }]}
              >
                <Text
                  style={[
                    styles.modeText,
                    { color: viewMode === 'LIST' ? theme.onAccent : theme.textSecondary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Danh sách
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('2D')}
                style={[styles.modePill, viewMode === '2D' && { backgroundColor: theme.accent }]}
              >
                <Text
                  style={[
                    styles.modeText,
                    { color: viewMode === '2D' ? theme.onAccent : theme.textSecondary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Sơ đồ 2D
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Sport Category Filter right below "Chọn sân thi đấu" */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sportFilterScroll}
            contentContainerStyle={styles.sportFilterRow}
          >
            {SPORT_CATEGORIES.map((sport) => {
              const isSelected = selectedSport === sport.key;
              const sportCount =
                sport.key === 'ALL'
                  ? venues.length
                  : venues.filter((v) => detectVenueSport(v) === sport.key).length;
              return (
                <Pressable
                  key={sport.key}
                  onPress={() => setSelectedSport(sport.key)}
                  style={[
                    styles.sportChip,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.surfaceElevated,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sportChipCount,
                      {
                        color: isSelected ? theme.onAccent : theme.textSecondary,
                        fontFamily: fonts.bodyMedium,
                      },
                    ]}
                  >
                    {sportCount} sân
                  </Text>
                  <Text
                    style={[
                      styles.sportChipText,
                      {
                        color: isSelected ? theme.onAccent : theme.textHeading,
                        fontFamily: fonts.headingBold,
                      },
                    ]}
                  >
                    {sport.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingVenues ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.md }} />
          ) : venues.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Chưa có sân khả dụng trong cơ sở này.
              </Text>
            </View>
          ) : filteredVenues.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Chưa có sân {SPORT_LABELS[selectedSport]} tại cơ sở này.
              </Text>
            </View>
          ) : viewMode === '2D' ? (
            <PitchMap2D
              venues={filteredVenues}
              selectedVenue={selectedVenue}
              onSelectVenue={(v) => setSelectedVenue(v)}
              sportTypes={selectedFacility?.sportTypes || []}
            />
          ) : (
            <View style={styles.venueGrid}>
              {filteredVenues.map((v) => {
                const active = selectedVenue?._id === v._id;
                const price = v.defaultPrice ?? v.basePricePerHour ?? 0;
                const sportLabel = SPORT_LABELS[detectVenueSport(v)];
                return (
                  <Pressable
                    key={v._id}
                    onPress={() => setSelectedVenue(v)}
                    style={[
                      styles.venueCard,
                      {
                        backgroundColor: active ? theme.accent : theme.surfaceElevated,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.venueName,
                        { color: active ? theme.onAccent : theme.textHeading, fontFamily: fonts.headingBold },
                      ]}
                    >
                      {v.name}
                    </Text>
                    <Text
                      style={[
                        styles.venuePrice,
                        { color: active ? theme.onAccent : theme.accent, fontFamily: fonts.bodySemiBold },
                      ]}
                    >
                      {price.toLocaleString('vi-VN')} đ/giờ
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.venueSub,
                        { color: active ? theme.onAccent : theme.textSecondary, fontFamily: fonts.body },
                      ]}
                    >
                      {v.courtCode ? `${sportLabel} - Mã sân ${v.courtCode}` : sportLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Chọn ngày đặt
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {dateOptions.map((d) => {
              const active = (selectedDate || dateOptions[0].dateStr) === d.dateStr;
              return (
                <Pressable
                  key={d.dateStr}
                  onPress={() => setSelectedDate(d.dateStr)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: active ? theme.accent : theme.surfaceElevated,
                      borderColor: active ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateDayName,
                      { color: active ? theme.onAccent : theme.textSecondary, fontFamily: fonts.bodyMedium },
                    ]}
                  >
                    {d.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dateDayNum,
                      { color: active ? theme.onAccent : theme.textHeading, fontFamily: fonts.headingBold },
                    ]}
                  >
                    {d.dayNumber}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 30-Minute Slot Matrix */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Ma trận khung giờ 30 phút
          </Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Đang chọn
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Cao điểm
              </Text>
            </View>
          </View>

          {loadingSlots ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.md }} />
          ) : slots.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Chưa có dữ liệu khung giờ cho ngày này.
              </Text>
            </View>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((slot) => {
                const isBooked = slot.status === 'CONFIRMED' || slot.status === 'HELD' || slot.status === 'PAST';
                const isPeak = isPeakSlot(slot.startTime);
                const isSelected = selectedSlotTimes.includes(slot.startTime);

                return (
                  <Pressable
                    key={slot.startTime}
                    disabled={isBooked}
                    onPress={() => toggleSlot(slot)}
                    style={[
                      styles.slotBtn,
                      {
                        backgroundColor: isBooked
                          ? theme.surface
                          : isSelected
                            ? theme.accent
                            : theme.surfaceElevated,
                        borderColor: isBooked
                          ? theme.borderSubtle
                          : isSelected
                            ? theme.accent
                            : isPeak
                              ? theme.warning
                              : theme.border,
                        opacity: isBooked ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        {
                          color: isBooked
                            ? theme.textMuted
                            : isSelected
                              ? theme.onAccent
                              : theme.textHeading,
                          fontFamily: fonts.bodySemiBold,
                        },
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                    {isBooked ? (
                      <X size={12} strokeWidth={2} color={theme.danger} />
                    ) : isPeak ? (
                      <Star
                        size={11}
                        strokeWidth={1.75}
                        color={isSelected ? theme.onAccent : theme.warning}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Equipment Addons from DB */}
        {equipments.length > 0 ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardHeader, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
              Thuê thiết bị kèm theo
            </Text>
            {equipments.map((eq) => {
              const checked = selectedEquipmentIds.includes(eq._id);
              const fee = eq.rentalFee ?? eq.depositAmount ?? 0;
              return (
                <Pressable
                  key={eq._id}
                  onPress={() => toggleEquipment(eq._id)}
                  style={[styles.addonRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderSubtle }]}
                >
                  <View style={styles.addonLeft}>
                    <View
                      style={[
                        styles.checkBox,
                        {
                          borderColor: checked ? theme.accent : theme.borderLight,
                          backgroundColor: checked ? theme.accent : 'transparent',
                        },
                      ]}
                    >
                      {checked ? <Text style={{ color: theme.onAccent, fontSize: 10, fontFamily: fonts.bodySemiBold }}>✓</Text> : null}
                    </View>
                    <Text style={[styles.addonLabel, { color: theme.textPrimary, fontFamily: fonts.bodyMedium }]}>
                      {eq.name}
                    </Text>
                  </View>
                  <Text style={[styles.addonPrice, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                    +{fee.toLocaleString('vi-VN')} đ
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Voucher Selector */}
        <Pressable
          onPress={onOpenVouchers}
          style={[styles.voucherCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.voucherLeft}>
            <View style={[styles.voucherIcon, { backgroundColor: theme.accentSoft }]}>
              <Tag size={16} strokeWidth={1.75} color={theme.accent} />
            </View>
            <View>
              <Text style={[styles.voucherTag, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Mã giảm giá / Voucher
              </Text>
              <Text style={[styles.voucherTitle, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                {appliedVoucher ? `Đã áp dụng ${appliedVoucher.code}` : 'Chưa áp dụng mã giảm giá'}
              </Text>
            </View>
          </View>
          {appliedVoucher ? (
            <Pressable onPress={() => setAppliedVoucher(null, 0)}>
              <Text style={[styles.removeVoucher, { color: theme.danger, fontFamily: fonts.bodySemiBold }]}>
                Gỡ mã
              </Text>
            </Pressable>
          ) : (
            <View style={styles.voucherChoose}>
              <Text style={[styles.voucherChooseText, { color: theme.accent, fontFamily: fonts.bodyMedium }]}>
                Chọn mã
              </Text>
              <ChevronRight size={15} strokeWidth={1.75} color={theme.accent} />
            </View>
          )}
        </Pressable>

        {/* Price Summary & Checkout */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.summaryRows}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceName, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Tiền sân ({selectedSlotObjs.length * 30} phút)
              </Text>
              <Text style={[styles.priceVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                {fieldSubtotal.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            {equipSubtotal > 0 ? (
              <View style={styles.priceRow}>
                <Text style={[styles.priceName, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  Thuê dụng cụ thi đấu
                </Text>
                <Text style={[styles.priceVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                  {equipSubtotal.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ) : null}
            {appliedVoucher ? (
              <View style={styles.priceRow}>
                <Text style={[styles.priceName, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  Voucher ({appliedVoucher.code})
                </Text>
                <Text style={[styles.priceVal, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                  -{voucherAmount.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.totalBlock, { borderTopColor: theme.borderSubtle }]}>
            <View>
              <Text style={[styles.totalLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Tổng thanh toán
              </Text>
              <Text style={[styles.totalValue, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                {totalPayable.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={[styles.holdBadge, { backgroundColor: theme.accentSecondarySoft }]}>
              <Text style={[styles.holdBadgeText, { color: theme.accentSecondary, fontFamily: fonts.bodySemiBold }]}>
                Giữ chỗ 10:00
              </Text>
            </View>
          </View>

          <View style={styles.ctaGrid}>
            <Pressable
              onPress={() => handleConfirmHold('VIETQR')}
              disabled={holding}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: theme.accent, opacity: holding ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.ctaText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                VietQR PayOS
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleConfirmHold('WALLET')}
              disabled={holding}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: theme.accentSecondary, opacity: holding ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.ctaText, { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold }]}>
                Ví Phanta Pay
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <AppDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={() => setDialog((d) => ({ ...d, visible: false }))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  ruleBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  ruleBtnText: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  section: { gap: spacing.sm },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitle: { fontSize: 16 },
  sportFilterScroll: { width: '100%' },
  sportFilterRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  sportChip: {
    minWidth: 78,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
  },
  sportChipCount: { fontSize: 11 },
  sportChipText: { fontSize: 14 },
  modeSwitch: { flexDirection: 'row', borderRadius: radius.sm, borderWidth: 1, padding: 3, gap: 2 },
  modePill: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 6 },
  modeText: { fontSize: 11 },
  emptyBox: { padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 12, textAlign: 'center' },
  venueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  venueCard: { width: '48.5%', borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  venueName: { fontSize: 13 },
  venuePrice: { fontSize: 13 },
  venueSub: { fontSize: 11 },
  dateRow: { gap: spacing.sm, paddingVertical: 2 },
  dateChip: { minWidth: 60, minHeight: 56, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: spacing.sm },
  dateDayName: { fontSize: 11 },
  dateDayNum: { fontSize: 16 },
  legendRow: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 12 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotBtn: {
    width: '23%',
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  slotText: { fontSize: 13 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  cardHeader: { fontSize: 12 },
  addonRow: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addonLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  checkBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  addonLabel: { fontSize: 12, flex: 1 },
  addonPrice: { fontSize: 13 },
  voucherCard: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  voucherLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  voucherIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  voucherTag: { fontSize: 11 },
  voucherTitle: { fontSize: 13 },
  voucherChoose: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voucherChooseText: { fontSize: 12 },
  removeVoucher: { fontSize: 12 },
  summaryRows: { gap: spacing.xs },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  priceName: { fontSize: 12, flex: 1 },
  priceVal: { fontSize: 13 },
  totalBlock: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 11 },
  totalValue: { fontSize: 22 },
  holdBadge: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  holdBadgeText: { fontSize: 11 },
  ctaGrid: { flexDirection: 'row', gap: spacing.sm },
  ctaBtn: { flex: 1, minHeight: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 13 },
});
