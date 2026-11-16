// mobile/src/screens/VenueSlotGridScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { Venue, SlotAvailability } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { subscribeSlotChanges } from '../socket/socket';
import { PitchMap2D } from '../components/PitchMap2D';

interface Props {
  onBack: () => void;
  onProceedPayment: () => void;
}

export const VenueSlotGridScreen: React.FC<Props> = ({ onBack, onProceedPayment }) => {
  const { selectedFacility, setSelectedVenue, selectedVenue, selectedDate, setSelectedDate, setActiveBooking } = useBookingStore();

  const [viewMode, setViewMode] = useState<'2D' | 'LIST'>('2D');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [holding, setHolding] = useState(false);

  // Generate 5 upcoming days
  const dateOptions = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : `Thứ ${d.getDay() + 1 === 1 ? 'CN' : d.getDay() + 1}`;
    const dayMonth = `${d.getDate()}/${d.getMonth() + 1}`;
    return { dateStr, dayName, dayMonth };
  });

  // Load venues
  useEffect(() => {
    if (!selectedFacility) return;
    const loadVenues = async () => {
      try {
        setLoadingVenues(true);
        const data = await api.getVenues(selectedFacility._id);
        setVenues(data);
        if (data.length > 0 && !selectedVenue) {
          setSelectedVenue(data[0]);
        }
      } catch (err) {
        console.error('Failed to load venues:', err);
      } finally {
        setLoadingVenues(false);
      }
    };
    loadVenues();
  }, [selectedFacility]);

  // Load availability
  const loadAvailability = async () => {
    if (!selectedVenue || !selectedDate) return;
    try {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const res = await api.getVenueAvailability(selectedVenue._id, selectedDate);
      setSlots(res.slots || []);
    } catch (err) {
      console.error('Failed to load availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [selectedVenue, selectedDate]);

  // Real-time Socket.io listener for slot changes
  useEffect(() => {
    const unsubscribe = subscribeSlotChanges((data) => {
      if (
        selectedVenue &&
        data.venueId === selectedVenue._id &&
        data.bookingDate === selectedDate
      ) {
        setSlots((prevSlots) =>
          prevSlots.map((s) => {
            if (s.startTime === data.startTime) {
              return {
                ...s,
                status: data.status as any,
                holdExpiresAt: data.holdExpiresAt,
              };
            }
            return s;
          })
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedVenue, selectedDate]);

  // Handle Hold Slot
  const handleHoldSlot = async () => {
    if (!selectedVenue || !selectedSlot) return;

    setHolding(true);
    try {
      const booking = await api.holdSlot({
        venueId: selectedVenue._id,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });

      setActiveBooking(booking);
      onProceedPayment();
    } catch (err: any) {
      const msg = err.message || 'Khung giờ này đã được giữ chỗ hoặc đặt!';
      Alert.alert('Không thể giữ chỗ', msg);
      loadAvailability();
    } finally {
      setHolding(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.topBarInfo}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {selectedFacility?.name || 'Chọn Sân'}
            </Text>
            <Text style={styles.topBarSubtitle}>
              Giờ mở cửa: {selectedFacility?.openHour || '06:00'} - {selectedFacility?.closeHour || '23:00'} (Block 30 phút)
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* View Mode Toggle (2D Pitch Map vs List) */}
          <View style={styles.viewModeToggleRow}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === '2D' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('2D')}
            >
              <Text style={[styles.viewModeBtnText, viewMode === '2D' && styles.viewModeBtnTextActive]}>
                🏟️ Sơ Đồ 2D (Pitch Map)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'LIST' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('LIST')}
            >
              <Text style={[styles.viewModeBtnText, viewMode === 'LIST' && styles.viewModeBtnTextActive]}>
                📋 Danh Sách (List)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Venue Selection: 2D Pitch Map or List */}
          {loadingVenues ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : viewMode === '2D' ? (
            <PitchMap2D
              venues={venues}
              selectedVenue={selectedVenue}
              onSelectVenue={setSelectedVenue}
              sportTypes={selectedFacility?.sportTypes}
            />
          ) : (
            <>
              <Text style={styles.sectionTitle}>1. CHỌN SÂN / VỊ TRÍ CHƠI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {venues.map((v) => {
                  const isSelected = selectedVenue?._id === v._id;
                  const price = (v as any).defaultPrice ?? v.basePricePerHour ?? 200000;
                  return (
                    <TouchableOpacity
                      key={v._id}
                      style={[
                        styles.venuePill,
                        v.isComposite && styles.compositeVenuePill,
                        isSelected && styles.activeVenuePill,
                      ]}
                      onPress={() => setSelectedVenue(v)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.venuePillName, isSelected && styles.activeVenuePillName]}>
                          {v.name}
                        </Text>
                        {v.courtCode && (
                          <Text style={[styles.courtCodeBadge, isSelected && { color: '#090d16', backgroundColor: '#fff' }]}>
                            #{v.courtCode}
                          </Text>
                        )}
                      </View>
                      {v.isComposite && (
                        <Text style={[styles.compositeNote, isSelected && { color: 'rgba(9, 13, 22, 0.8)' }]}>
                          ⚡ Ghép ({v.baseUnitCodes?.join('+')})
                        </Text>
                      )}
                      <Text style={[styles.venuePillPrice, isSelected && styles.activeVenuePillPrice]}>
                        {price.toLocaleString('vi-VN')} đ/h
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Date Picker Tabs */}
          <Text style={styles.sectionTitle}>2. CHỌN NGÀY ĐẶT SÂN</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {dateOptions.map((opt) => {
              const isSelected = selectedDate === opt.dateStr;
              return (
                <TouchableOpacity
                  key={opt.dateStr}
                  style={[styles.dateTab, isSelected && styles.activeDateTab]}
                  onPress={() => setSelectedDate(opt.dateStr)}
                >
                  <Text style={[styles.dateDayName, isSelected && styles.activeDateText]}>
                    {opt.dayName}
                  </Text>
                  <Text style={[styles.dateDayMonth, isSelected && styles.activeDateText]}>
                    {opt.dayMonth}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Dynamic Pricing BR-04 Notice Banner */}
          <View style={styles.pricingNotice}>
            <Text style={styles.pricingNoticeTitle}>⚡ Biểu Giá Động Theo BR-04:</Text>
            <Text style={styles.pricingNoticeDesc}>
              • Giá niêm yết theo block 30 phút • Giờ vàng cao điểm: Phụ thu +25.000đ/block (+50.000đ/giờ) vào 17:30 - 21:00 (T2-T6) & toàn bộ Thứ 7, CN.
            </Text>
          </View>

          {/* Slots Grid */}
          <View style={styles.slotHeaderRow}>
            <Text style={styles.sectionTitle}>3. CHỌN KHUNG GIỜ HOẠT ĐỘNG</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Thời gian thực</Text>
            </View>
          </View>

          {loadingSlots ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Đang cập nhật lịch sân trực tiếp...</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((s, idx) => {
                const isSelected = selectedSlot?.startTime === s.startTime;
                const isAvailable = s.status === 'AVAILABLE';
                const isHeld = s.status === 'HELD';
                const isConfirmed = s.status === 'CONFIRMED';

                let cardStyle = styles.slotCardAvailable;
                let statusLabel = 'Còn trống';
                let labelStyle = styles.slotStatusAvailable;

                if (isHeld) {
                  cardStyle = styles.slotCardHeld;
                  statusLabel = 'Đang giữ';
                  labelStyle = styles.slotStatusHeld;
                } else if (isConfirmed) {
                  cardStyle = styles.slotCardConfirmed;
                  statusLabel = 'Đã đặt';
                  labelStyle = styles.slotStatusConfirmed;
                }

                if (isSelected) {
                  cardStyle = styles.slotCardSelected;
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    disabled={!isAvailable}
                    style={[styles.slotCard, cardStyle]}
                    onPress={() => setSelectedSlot(s)}
                  >
                    <Text style={[styles.slotTime, isSelected && styles.textWhite]}>
                      {s.startTime}
                    </Text>
                    <Text style={[styles.slotPrice, isSelected && styles.textWhite]}>
                      {s.price.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={[styles.slotStatus, labelStyle, isSelected && styles.textWhite]}>
                      {isSelected ? '✓ Đã chọn' : statusLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.surfaceLight }]} />
              <Text style={styles.legendText}>Trống</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>Đang giữ (10p)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={styles.legendText}>Đã thanh toán</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Booking Action Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            {selectedSlot ? (
              <>
                <Text style={[styles.bottomBarValue, { fontSize: 15, fontWeight: '800' }]}>
                  {selectedVenue?.name} ({selectedSlot.startTime} - {selectedSlot.endTime})
                </Text>
                <Text style={[styles.bottomBarLabel, { color: colors.primary, fontWeight: '800', marginTop: 2 }]}>
                  {selectedSlot.price.toLocaleString('vi-VN')} đ
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bottomBarLabel}>Khung giờ đã chọn:</Text>
                <Text style={styles.bottomBarValue}>Chưa chọn khung giờ</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            disabled={!selectedSlot || holding}
            style={[styles.holdBtn, (!selectedSlot || holding) && styles.holdBtnDisabled]}
            onPress={handleHoldSlot}
          >
            {holding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.holdBtnText}>Giữ Chỗ (10 Phút) →</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 20,
    color: '#fff',
  },
  topBarInfo: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#00f2fe',
  },
  viewModeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  viewModeBtnTextActive: {
    color: '#00f2fe',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pillsRow: {
    gap: 8,
    marginBottom: 16,
  },
  venuePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compositeVenuePill: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  activeVenuePill: {
    backgroundColor: '#00f2fe',
    borderColor: '#00f2fe',
  },
  venuePillName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  activeVenuePillName: {
    color: '#090d16',
  },
  courtCodeBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00f2fe',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  compositeNote: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fbbf24',
    marginTop: 2,
  },
  venuePillPrice: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeVenuePillPrice: {
    color: 'rgba(9, 13, 22, 0.85)',
    fontWeight: '700',
  },
  dateTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 68,
  },
  activeDateTab: {
    backgroundColor: '#00f2fe',
    borderColor: '#00f2fe',
  },
  dateDayName: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  dateDayMonth: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  activeDateText: {
    color: '#090d16',
    fontWeight: '800',
  },
  pricingNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  pricingNoticeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
    textTransform: 'uppercase',
  },
  pricingNoticeDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  slotsLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  slotCard: {
    width: '23%',
    aspectRatio: 1.1,
    borderRadius: 12,
    padding: 6,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  slotCardAvailable: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  slotCardHeld: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: colors.warning,
    opacity: 0.6,
  },
  slotCardConfirmed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.danger,
    opacity: 0.6,
  },
  slotCardSelected: {
    backgroundColor: '#00f2fe',
    borderColor: '#00f2fe',
  },
  slotTime: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  slotPrice: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  slotStatus: {
    fontSize: 8,
    fontWeight: '800',
  },
  slotStatusAvailable: {
    color: colors.success,
  },
  slotStatusHeld: {
    color: colors.warning,
  },
  slotStatusConfirmed: {
    color: colors.danger,
  },
  textWhite: {
    color: '#090d16',
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarInfo: {
    flex: 1,
    marginRight: 12,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomBarValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  holdBtn: {
    backgroundColor: '#00f2fe',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdBtnDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.5,
  },
  holdBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#090d16',
  },
});
