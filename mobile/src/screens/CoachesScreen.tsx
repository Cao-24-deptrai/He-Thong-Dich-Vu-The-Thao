import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
}

const FILTERS = [
  { key: '', label: 'Tất cả môn' },
  { key: 'TENNIS', label: 'Quần vợt' },
  { key: 'SWIMMING', label: 'Bơi lội' },
  { key: 'BADMINTON', label: 'Cầu lông' },
  { key: 'GYM', label: 'Thể hình PT' },
];

const SPECIALTY_TITLES: Record<string, string> = {
  TENNIS: 'Chuyên gia Quần vợt và Thể lực',
  SWIMMING: 'Chuyên gia Bơi lội và Phục hồi',
  BADMINTON: 'Chuyên gia Cầu lông và Bộ pháp',
  GYM: 'Huấn luyện viên Thể hình PT 1-1',
};

const DEFAULT_SLOTS_BY_SPECIALTY: Record<string, { startTime: string; endTime: string }[]> = {
  TENNIS: [
    { startTime: '10:00', endTime: '11:00' },
    { startTime: '14:00', endTime: '15:00' },
    { startTime: '19:30', endTime: '20:30' },
  ],
  SWIMMING: [
    { startTime: '08:00', endTime: '09:00' },
    { startTime: '16:30', endTime: '17:30' },
  ],
  BADMINTON: [
    { startTime: '17:00', endTime: '18:00' },
    { startTime: '19:00', endTime: '20:00' },
  ],
  GYM: [
    { startTime: '07:00', endTime: '08:00' },
    { startTime: '18:00', endTime: '19:00' },
    { startTime: '20:00', endTime: '21:00' },
  ],
};

const getSlotsForTrainer = (trainer: any) => {
  const specs: string[] = Array.isArray(trainer?.specialties) ? trainer.specialties : [];
  const key = specs[0]?.toUpperCase() || 'TENNIS';
  return DEFAULT_SLOTS_BY_SPECIALTY[key] || DEFAULT_SLOTS_BY_SPECIALTY.TENNIS;
};

const cleanText = (val?: string): string => {
  if (!val) return '';
  if (!val.includes('\uFFFD') && !val.includes('?')) return val;
  return val
    .replace(/HLV Ho[^\s]*ng Nam/gi, 'HLV Hoàng Nam')
    .replace(/HLV Qu[^\s]*c B[^\s]*o/gi, 'HLV Quốc Bảo')
    .replace(/Coach Minh Qu[^\s]*n/gi, 'Coach Minh Quân')
    .replace(/Kh[^\s]*a Qu[^\s]*n V[^\s]*t C[^\s]* B[^\s]*n/gi, 'Khóa Quần Vợt Cơ Bản')
    .replace(/L[^\s]*p B[^\s]*i S[^\s]*i N[^\s]*ng Cao/gi, 'Lớp Bơi Sải Nâng Cao')
    .replace(/L[^\s]*p C[^\s]*u L[^\s]*ng K[^\s]* Thu[^\s]*t/gi, 'Lớp Cầu Lông Kỹ Thuật')
    .replace(/L[^\s]*p Th[^\s]* H[^\s]*nh/gi, 'Lớp Thể Hình')
    .replace(/Th[^\s]* 3 - 5 - 7/gi, 'Thứ 3 - 5 - 7')
    .replace(/Th[^\s]* 2 - 4 - 6/gi, 'Thứ 2 - 4 - 6')
    .replace(/Bu[^\s]*i/gi, 'Buổi');
};

const matchesClassSport = (cls: any, filter: string): boolean => {
  if (!filter) return true;
  if ((cls.classType || '').toUpperCase() === filter) return true;
  const hay = `${cls.name || ''} ${cls.title || ''} ${cls.trainerName || ''} ${cls.roomName || ''}`.toLowerCase();
  if (filter === 'TENNIS') return hay.includes('quần vợt') || hay.includes('tennis') || hay.includes('hoàng nam') || hay.includes('nam');
  if (filter === 'SWIMMING') return hay.includes('bơi') || hay.includes('swimming') || hay.includes('mai linh');
  if (filter === 'BADMINTON') return hay.includes('cầu lông') || hay.includes('badminton') || hay.includes('quốc bảo') || hay.includes('bảo');
  if (filter === 'GYM') return hay.includes('thể hình') || hay.includes('gym') || hay.includes('core') || hay.includes('crossfit') || hay.includes('minh quân');
  return true;
};

export const CoachesScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [activeFilter, setActiveFilter] = useState('');
  const [trainers, setTrainers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, { startTime: string; endTime: string }>>({});
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadData = async (specialty: string) => {
    try {
      setLoading(true);
      const [trRes, clRes] = await Promise.allSettled([
        api.getTrainers(specialty || undefined),
        api.getClasses(),
      ]);
      if (trRes.status === 'fulfilled' && Array.isArray(trRes.value)) {
        setTrainers(trRes.value);
      }
      if (clRes.status === 'fulfilled' && Array.isArray(clRes.value)) {
        setClasses(clRes.value);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeFilter);
  }, [activeFilter]);

  const handleBookPt = async (trainer: any) => {
    try {
      setBookingId(trainer._id);
      const today = new Date().toISOString().split('T')[0];
      const availableSlots = getSlotsForTrainer(trainer);
      const chosenSlot = selectedSlots[trainer._id] || availableSlots[0];
      await api.bookPtSession({
        trainerId: trainer._id,
        date: today,
        startTime: chosenSlot.startTime,
        endTime: chosenSlot.endTime,
      });
      setDialog({
        visible: true,
        title: 'Đặt lịch PT thành công',
        message: `Đã đặt lịch tập 1-1 với ${cleanText(trainer.fullName || trainer.name)} vào ${chosenSlot.startTime} - ${chosenSlot.endTime}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập để đặt lịch PT.';
      setDialog({ visible: true, title: 'Không thể đặt lịch PT', message: msg });
    } finally {
      setBookingId(null);
    }
  };

  const handleRegisterClass = async (cls: any) => {
    try {
      setBookingId(cls._id);
      await api.registerClass(cls._id);
      setDialog({
        visible: true,
        title: 'Đăng ký lớp học thành công',
        message: `Đã ghi nhận đăng ký tham gia ${cls.title || cls.name}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập để đăng ký lớp học.';
      setDialog({ visible: true, title: 'Không thể đăng ký', message: msg });
    } finally {
      setBookingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Huấn luyện viên và lớp tập" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Pressable
                key={f.key || 'ALL'}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.accent : theme.surfaceElevated,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? theme.onAccent : theme.textPrimary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
        ) : (
          <>
            {trainers.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  Chưa có huấn luyện viên nào trong danh mục này.
                </Text>
              </View>
            ) : (
              trainers.map((t) => {
                const trainerSlots = getSlotsForTrainer(t);
                const activeSlot = selectedSlots[t._id] || trainerSlots[0];
                const specKey = Array.isArray(t.specialties) ? t.specialties[0] : '';
                const roleLabel =
                  SPECIALTY_TITLES[specKey] ||
                  (Array.isArray(t.specialties) ? t.specialties.join(', ') : t.specialty || 'Huấn luyện viên');
                const bioText =
                  t.bio && !t.bio.includes('\uFFFD')
                    ? t.bio
                    : 'Huấn luyện viên chuyên nghiệp với giáo án cá nhân hóa theo thể trạng và mục tiêu tập luyện.';
                return (
                  <View
                    key={t._id}
                    style={[styles.coachCard, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}
                  >
                    <View style={styles.coachTop}>
                      <Image
                        source={
                          t.avatarUrl
                            ? { uri: t.avatarUrl }
                            : require('../../assets/logo.jpg')
                        }
                        style={[styles.coachAvatar, { borderColor: theme.accent }]}
                      />
                      <View style={styles.coachMeta}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.coachName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                            {cleanText(t.fullName || t.name)}
                          </Text>
                          <View style={[styles.ratingPill, { backgroundColor: theme.accent }]}>
                            <Star size={10} strokeWidth={2} color={theme.onAccent} fill={theme.onAccent} />
                            <Text style={[styles.ratingText, { color: theme.onAccent, fontFamily: fonts.headingBold }]}>
                              {t.rating || (specKey === 'SWIMMING' ? '5.0' : '4.9')}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.coachRole, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                          {roleLabel}
                        </Text>
                        <Text style={[styles.coachPrice, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                          {(t.hourlyRate || 300000).toLocaleString('vi-VN')} đ / Giờ PT 1-1
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.coachBio, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      {bioText}
                    </Text>

                    <View style={[styles.slotDivider, { borderTopColor: theme.borderSubtle }]}>
                      <Text style={[styles.slotLabel, { color: theme.textMuted, fontFamily: fonts.bodySemiBold }]}>
                        Lịch trống hôm nay
                      </Text>
                      <View style={styles.slotRow}>
                        {trainerSlots.map((slot) => {
                          const isChosen = activeSlot?.startTime === slot.startTime;
                          return (
                            <Pressable
                              key={slot.startTime}
                              onPress={() =>
                                setSelectedSlots((prev) => ({
                                  ...prev,
                                  [t._id]: slot,
                                }))
                              }
                              style={[
                                styles.slotPill,
                                {
                                  backgroundColor: isChosen ? theme.accent : theme.surfaceElevated,
                                  borderColor: isChosen ? theme.accent : theme.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.slotPillText,
                                  {
                                    color: isChosen ? theme.onAccent : theme.textPrimary,
                                    fontFamily: isChosen ? fonts.bodySemiBold : fonts.bodyMedium,
                                  },
                                ]}
                              >
                                {slot.startTime} - {slot.endTime}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <Pressable
                      disabled={bookingId === t._id}
                      onPress={() => handleBookPt(t)}
                      style={({ pressed }) => [
                        styles.bookBtn,
                        { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text style={[styles.bookBtnText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                        Đặt lịch PT 1-1 ({(t.hourlyRate || 300000).toLocaleString('vi-VN')} đ)
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}

            <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
              Lớp học kỹ năng trong tuần
            </Text>

            {(() => {
              const filteredClasses = classes.filter((cls) => matchesClassSport(cls, activeFilter));
              if (filteredClasses.length === 0) {
                return (
                  <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Chưa có buổi học nhóm nào trong danh mục này.
                    </Text>
                  </View>
                );
              }
              return filteredClasses.map((cls) => {
                const dateLabel = cls.date
                  ? new Date(cls.date).toLocaleDateString('vi-VN')
                  : '';
                const classPrice = cls.pricePerSession ?? cls.price ?? 0;
                return (
                  <View
                    key={cls._id}
                    style={[styles.classCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.classTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                        {cleanText(cls.title || cls.name)}
                      </Text>
                      <Text style={[styles.classSchedule, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                        {dateLabel ? `${dateLabel} - ` : ''}Khung giờ: {cls.startTime} - {cls.endTime}
                        {cls.roomName && !cls.roomName.includes('\uFFFD') ? ` - ${cls.roomName}` : ''}
                      </Text>
                      <Text style={[styles.classPrice, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                        {classPrice.toLocaleString('vi-VN')} đ / Buổi
                      </Text>
                    </View>
                    <Pressable
                      disabled={bookingId === cls._id}
                      onPress={() => handleRegisterClass(cls)}
                      style={({ pressed }) => [
                        styles.registerBtn,
                        { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text style={[styles.registerText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                        Đăng ký
                      </Text>
                    </Pressable>
                  </View>
                );
              });
            })()}
          </>
        )}
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
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  filterScroll: { width: '100%' },
  filterRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: spacing.sm, paddingVertical: 2 },
  filterChip: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center' },
  filterText: { fontSize: 12 },
  emptyBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  coachCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  coachTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  coachAvatar: { width: 64, height: 64, borderRadius: radius.lg, borderWidth: 1.5 },
  coachMeta: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coachName: { fontSize: 16 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ratingText: { fontSize: 10 },
  coachRole: { fontSize: 12 },
  coachPrice: { fontSize: 13, marginTop: 2 },
  coachBio: { fontSize: 12, lineHeight: 18 },
  slotDivider: { borderTopWidth: 1, paddingTop: spacing.sm, gap: spacing.xs },
  slotLabel: { fontSize: 11, textTransform: 'uppercase' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  slotPill: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillText: { fontSize: 12 },
  bookBtn: { minHeight: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { fontSize: 13 },
  sectionTitle: { fontSize: 15, marginTop: spacing.xs },
  classCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  classTitle: { fontSize: 14 },
  classSchedule: { fontSize: 12 },
  classPrice: { fontSize: 13 },
  registerBtn: { minHeight: 42, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  registerText: { fontSize: 12 },
});
