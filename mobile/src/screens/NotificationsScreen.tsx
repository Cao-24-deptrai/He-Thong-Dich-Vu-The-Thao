// mobile/src/screens/NotificationsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface NotificationItem {
  id: string;
  type: 'SCHEDULE' | 'WALLET' | 'PROMO';
  title: string;
  body: string;
  time: string;
  isRead: boolean;
}

export const NotificationsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULE' | 'WALLET'>('ALL');

  const notifications: NotificationItem[] = [
    {
      id: 'N-1',
      type: 'SCHEDULE',
      title: 'Nhắc Lịch Thi Đấu: Còn 60 Phút!',
      body: 'Trận bóng đá Sân mini F1 bắt đầu lúc 18:00 hôm nay. Vui lòng có mặt trước 10 phút để nhận sân và dụng cụ.',
      time: '17:00 Hôm nay',
      isRead: false,
    },
    {
      id: 'N-2',
      type: 'WALLET',
      title: 'Hoàn Tiền Cọc Tự Động Thành Công',
      body: 'Đã hoàn trả +150.000 đ vào ví Phanta Pay do bạn hủy sân trước 12 giờ đúng quy định.',
      time: '14:20 26/10',
      isRead: true,
    },
    {
      id: 'N-3',
      type: 'PROMO',
      title: 'Voucher Giảm 20% Giờ Vàng Đã Sẵn Sàng',
      body: 'Nhận ngay mã PHANTA20 áp dụng cho các khung giờ thi đấu 17:30 - 21:00 cuối tuần này!',
      time: '09:00 25/10',
      isRead: true,
    },
    {
      id: 'N-4',
      type: 'WALLET',
      title: 'Nạp Tiền Thành Công Qua VietQR PayOS',
      body: 'Giao dịch nạp +1.000.000 đ từ ngân hàng MB Bank đã được ghi nhận vào sổ cái ví Phanta Pay.',
      time: '20:30 24/10',
      isRead: true,
    },
  ];

  const filteredList = filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter);

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
            primary="Trung Tâm Thông Báo"
            secondary="Cập nhật lịch thi đấu, biến động ví & ưu đãi"
            badge="1 MỚI"
            badgeColor={colors.primary}
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['ALL', 'SCHEDULE', 'WALLET'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'ALL' ? 'Tất Cả' : f === 'SCHEDULE' ? 'Lịch Đấu' : 'Ví & Tiền'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {filteredList.map((n) => (
            <View key={n.id} style={[styles.notifCard, !n.isRead && styles.notifUnread]}>
              <View style={styles.notifTop}>
                <TwoLineText
                  primary={n.title}
                  secondary={n.body}
                  primaryStyle={{ fontSize: 14, color: !n.isRead ? colors.primary : '#fff' }}
                  secondaryStyle={{ fontSize: 12, lineHeight: 17 }}
                />
              </View>
              <View style={styles.notifBottom}>
                <Text style={styles.notifTime}>{n.time}</Text>
                {!n.isRead && <View style={styles.unreadDot} />}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  filterTextActive: { color: colors.primary },
  scroll: { paddingBottom: 30, gap: 10 },
  notifCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  notifUnread: {
    borderColor: colors.primary + '50',
    backgroundColor: '#0f172a',
  },
  notifTop: { marginBottom: 8 },
  notifBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTime: { fontSize: 10, color: colors.textMuted },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
