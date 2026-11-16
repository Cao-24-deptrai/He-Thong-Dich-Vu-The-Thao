// mobile/src/screens/TournamentsScreen.tsx
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

interface MatchItem {
  id: string;
  round: string;
  teamA: string;
  scoreA?: number;
  teamB: string;
  scoreB?: number;
  time: string;
  pitch: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
}

export const TournamentsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedSport, setSelectedSport] = useState<'SOCCER' | 'BADMINTON' | 'TENNIS'>('SOCCER');

  const matches: MatchItem[] = [
    { id: 'M-01', round: 'Tứ Kết 1', teamA: 'FC Báo Thủ', scoreA: 3, teamB: 'FC Rồng Vàng', scoreB: 1, time: '18:00 Hôm nay', pitch: 'Sân A1', status: 'FINISHED' },
    { id: 'M-02', round: 'Tứ Kết 2', teamA: 'Hải Âu FC', scoreA: 2, teamB: 'Thép Miền Nam', scoreB: 2, time: '19:30 Tối nay', pitch: 'Sân A2', status: 'LIVE' },
    { id: 'M-03', round: 'Tứ Kết 3', teamA: 'Chiến Binh Q7', teamB: 'Đoàn Kết FC', time: '18:00 Ngày mai', pitch: 'Sân B1', status: 'UPCOMING' },
    { id: 'M-04', round: 'Tứ Kết 4', teamA: 'Bách Khoa K60', teamB: 'Y Dược FC', time: '19:30 Ngày mai', pitch: 'Sân B2', status: 'UPCOMING' },
    { id: 'M-05', round: 'Bán Kết 1', teamA: 'FC Báo Thủ', teamB: 'Chờ TK2', time: '18:00 28/10', pitch: 'Sân Trung Tâm', status: 'UPCOMING' },
    { id: 'M-06', round: 'Chung Kết Cúp', teamA: 'Chờ BK1', teamB: 'Chờ BK2', time: '20:00 30/10', pitch: 'Sân Trung Tâm', status: 'UPCOMING' },
  ];

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
            primary="Giải Đấu & Nhánh Đấu Cúp"
            secondary="Phanta Championship 2026 / Cúp Mùa Thu"
            badge="GIẢI THƯỞNG 50TR"
            badgeColor="#f59e0b"
          />
        </View>

        {/* Sport Tabs */}
        <View style={styles.tabsRow}>
          {(['SOCCER', 'BADMINTON', 'TENNIS'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedSport(s)}
              style={[styles.tabBtn, selectedSport === s && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, selectedSport === s && styles.tabTextActive]}>
                {s === 'SOCCER' ? '⚽ Bóng Đá Cúp' : s === 'BADMINTON' ? '🏸 Cầu Lông Đôi' : '🎾 Tennis Master'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Prize Pool Card */}
          <View style={styles.prizeCard}>
            <TwoLineText
              primary="Tổng Quỹ Thưởng: 50.000.000 đ"
              secondary="Vô địch: 30.000.000 đ + Cúp Vàng / Á quân: 15.000.000 đ / Hạng ba: 5.000.000 đ"
              primaryStyle={{ color: '#fbbf24', fontSize: 16 }}
              secondaryStyle={{ color: '#e2e8f0' }}
            />
          </View>

          {/* Bracket Matches */}
          <Text style={styles.sectionTitle}>Lịch Thi Đấu & Kết Quả Knockout</Text>
          <View style={styles.matchesList}>
            {matches.map((m) => (
              <View key={m.id} style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <Text style={styles.roundBadge}>{m.round}</Text>
                  <Text style={styles.matchTime}>{m.time} / {m.pitch}</Text>
                  <View style={[
                    styles.statusBadge,
                    m.status === 'LIVE' ? styles.statusLive : m.status === 'FINISHED' ? styles.statusFinished : styles.statusUpcoming
                  ]}>
                    <Text style={styles.statusText}>
                      {m.status === 'LIVE' ? '● ĐANG ĐÁ' : m.status === 'FINISHED' ? 'KẾT THÚC' : 'SẮP DIỄN RA'}
                    </Text>
                  </View>
                </View>

                <View style={styles.teamsRow}>
                  <View style={styles.teamBox}>
                    <Text style={styles.teamName}>{m.teamA}</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreText}>
                      {m.scoreA !== undefined ? `${m.scoreA} - ${m.scoreB}` : 'VS'}
                    </Text>
                  </View>
                  <View style={[styles.teamBox, { alignItems: 'flex-end' }]}>
                    <Text style={styles.teamName}>{m.teamB}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Register Team Button */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => Alert.alert('Đăng ký đội', 'Đã ghi nhận yêu cầu đăng ký đội bóng vào danh sách chờ!')}
          >
            <Text style={styles.registerBtnText}>+ Đăng Ký Đội Thi Đấu Ngay</Text>
          </TouchableOpacity>
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
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: colors.primary },
  scroll: { paddingBottom: 30 },
  prizeCard: {
    backgroundColor: '#78350f25',
    borderWidth: 1,
    borderColor: '#f59e0b50',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
  matchesList: { gap: 10 },
  matchCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  matchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  roundBadge: { fontSize: 11, fontWeight: '800', color: colors.primary, backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  matchTime: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusLive: { backgroundColor: '#ef4444' },
  statusFinished: { backgroundColor: '#334155' },
  statusUpcoming: { backgroundColor: '#0284c7' },
  statusText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamBox: { flex: 1 },
  teamName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  scoreBox: { paddingHorizontal: 12 },
  scoreText: { fontSize: 16, fontWeight: '900', color: '#fbbf24' },
  registerBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
