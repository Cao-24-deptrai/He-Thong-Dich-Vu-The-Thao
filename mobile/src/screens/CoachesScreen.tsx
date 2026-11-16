// mobile/src/screens/CoachesScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface Coach {
  id: string;
  name: string;
  sport: string;
  title: string;
  elo: number;
  experienceYears: number;
  ratePerSession: number;
  rating: number;
  reviewCount: number;
  availableSlots: string[];
}

export const CoachesScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  const coaches: Coach[] = [
    {
      id: 'PT-01',
      name: 'HLV Tuấn Anh',
      sport: 'GYM',
      title: 'Chuyên gia Thể hình & Giảm mỡ IFBB',
      elo: 1950,
      experienceYears: 8,
      ratePerSession: 350000,
      rating: 4.9,
      reviewCount: 142,
      availableSlots: ['08:00 - 09:30', '16:00 - 17:30', '19:00 - 20:30'],
    },
    {
      id: 'PT-02',
      name: 'HLV Minh Đức',
      sport: 'BADMINTON',
      title: 'Cựu Vận Động Viên Quốc Gia Cầu Lông',
      elo: 2100,
      experienceYears: 10,
      ratePerSession: 400000,
      rating: 5.0,
      reviewCount: 98,
      availableSlots: ['07:00 - 08:30', '18:00 - 19:30'],
    },
    {
      id: 'PT-03',
      name: 'HLV Hải Yến',
      sport: 'SWIMMING',
      title: 'Kiện Tướng Bơi Lội & Huấn Luyện Cứu Hộ',
      elo: 1880,
      experienceYears: 6,
      ratePerSession: 300000,
      rating: 4.8,
      reviewCount: 76,
      availableSlots: ['09:00 - 10:30', '15:00 - 16:30'],
    },
    {
      id: 'PT-04',
      name: 'HLV Quang Huy',
      sport: 'TENNIS',
      title: 'Huấn Luyện Viên Cấp 1 VTF Tennis',
      elo: 2020,
      experienceYears: 9,
      ratePerSession: 450000,
      rating: 4.9,
      reviewCount: 112,
      availableSlots: ['06:00 - 07:30', '17:00 - 18:30'],
    },
  ];

  const filteredCoaches = selectedSport === 'ALL' ? coaches : coaches.filter((c) => c.sport === selectedSport);

  const handleBookCoach = (coach: Coach) => {
    Alert.alert(
      'Đặt Lịch Huấn Luyện Viên',
      `Bạn muốn đặt buổi tập 1-1 cùng ${coach.name}?\nHọc phí: ${coach.ratePerSession.toLocaleString('vi-VN')} đ/buổi (90 phút).`,
      [
        { text: 'Xác Nhận', onPress: () => Alert.alert('Thành Công', 'Đã đặt lịch tập! HLV sẽ liên hệ xác nhận giờ tập.') },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <TwoLineText
            primary="Đội Ngũ Huấn Luyện Viên & PT 1-1"
            secondary="Kiện tướng quốc gia & Chuyên gia thể lực thể thao"
            badge="PT 1-1"
            badgeColor={colors.primary}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'GYM', label: 'Thể Hình & Gym' },
            { id: 'BADMINTON', label: 'Cầu Lông' },
            { id: 'SWIMMING', label: 'Bơi Lội' },
            { id: 'TENNIS', label: 'Tennis' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setSelectedSport(f.id)}
              style={[styles.filterPill, selectedSport === f.id && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, selectedSport === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Coaches List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {filteredCoaches.map((c) => (
            <View key={c.id} style={styles.coachCard}>
              <View style={styles.coachTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.name.split(' ').pop()?.slice(0, 2).toUpperCase()}</Text>
                </View>

                <View style={styles.coachInfo}>
                  <TwoLineText
                    primary={c.name}
                    secondary={c.title}
                    primaryStyle={{ fontSize: 15 }}
                    secondaryStyle={{ fontSize: 11 }}
                  />
                  <View style={styles.metaRow}>
                    <Text style={styles.eloBadge}>ELO: {c.elo}</Text>
                    <Text style={styles.ratingText}>★ {c.rating} ({c.reviewCount})</Text>
                    <Text style={styles.expText}>{c.experienceYears} năm KN</Text>
                  </View>
                </View>
              </View>

              {/* Slot Tags */}
              <View style={styles.slotsRow}>
                <Text style={styles.slotsLabel}>Lịch rảnh:</Text>
                {c.availableSlots.map((slot, sidx) => (
                  <View key={sidx} style={styles.slotTag}>
                    <Text style={styles.slotTagText}>{slot}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.feeLabel}>Học phí 1-1:</Text>
                  <Text style={styles.feeValue}>{c.ratePerSession.toLocaleString('vi-VN')} đ/buổi</Text>
                </View>

                <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookCoach(c)}>
                  <Text style={styles.bookBtnText}>Đặt Lịch PT →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  filterScroll: { marginBottom: 14, maxHeight: 38 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterPillActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  filterText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  filterTextActive: { color: colors.primary },
  scroll: { paddingBottom: 30 },
  coachCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  coachTop: { flexDirection: 'row', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary + '25',
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '900', color: colors.primary },
  coachInfo: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  eloBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
    backgroundColor: '#78350f30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  expText: { fontSize: 10, color: colors.textMuted },
  slotsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border },
  slotsLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  slotTag: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  slotTagText: { fontSize: 10, color: '#38bdf8', fontWeight: '600' },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  feeLabel: { fontSize: 10, color: colors.textMuted },
  feeValue: { fontSize: 15, fontWeight: '800', color: colors.primary },
  bookBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },
});
