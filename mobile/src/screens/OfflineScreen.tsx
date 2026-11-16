// mobile/src/screens/OfflineScreen.tsx
import React from 'react';
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

export const OfflineScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const offlineTickets = [
    {
      id: 'OFF-1',
      code: 'PHANTA-BK1001',
      venue: 'Sân bóng mini F1',
      timeSlot: '18:00 - 19:30 Hôm nay',
      qrOffline: 'OFFLINE_HMAC_PHANTA_SEC256_BK1001',
      validUntil: '22:00 26/10/2026',
    },
    {
      id: 'OFF-2',
      code: 'GYM-MEMBER-GOLD',
      venue: 'Cửa Xoay IoT Face ID Gym & Hồ Bơi',
      timeSlot: 'Hội viên 30 ngày / Không giới hạn',
      qrOffline: 'OFFLINE_FACEID_SYNC_GOLD_99182',
      validUntil: '26/11/2026',
    },
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
            primary="Chế Độ Ngoại Tuyến"
            secondary="Gói vé Offline Pack & Sinh trắc học Face ID độc lập"
            badge="OFFLINE PACK"
            badgeColor="#f59e0b"
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Offline Notice Banner */}
          <View style={styles.noticeBox}>
            <TwoLineText
              primary="Bảo Lưu Vé Không Cần Kết Nối Mạng"
              secondary="Khi mất sóng hoặc mạng yếu, bạn vẫn có thể quét mã QR này qua mắt đọc cổng Turnstile bình thường nhờ cơ chế bảo mật chữ ký số HMAC lưu sẵn trên máy."
              primaryStyle={{ color: '#fbbf24', fontSize: 13 }}
              secondaryStyle={{ color: '#e2e8f0', fontSize: 11 }}
            />
          </View>

          <Text style={styles.sectionTitle}>Vé Đã Lưu Trong Bộ Nhớ Máy</Text>
          <View style={styles.ticketList}>
            {offlineTickets.map((t) => (
              <View key={t.id} style={styles.ticketCard}>
                <View style={styles.ticketTop}>
                  <TwoLineText
                    primary={t.venue}
                    secondary={t.timeSlot}
                    primaryStyle={{ fontSize: 15 }}
                    secondaryStyle={{ color: '#38bdf8' }}
                  />
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{t.code}</Text>
                  </View>
                </View>

                {/* Simulated QR block */}
                <View style={styles.qrContainer}>
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrIcon}>⚏</Text>
                    <Text style={styles.qrTokenText}>{t.qrOffline}</Text>
                  </View>
                  <Text style={styles.qrSub}>Mã quét bảo mật ngoại tuyến</Text>
                </View>

                <View style={styles.ticketFooter}>
                  <Text style={styles.validText}>Hiệu lực đến: {t.validUntil}</Text>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => Alert.alert('Mã QR Ngoại Tuyến', `Mã: ${t.code}\nĐã sẵn sàng quét qua đầu đọc cổng xoay Turnstile!`)}
                  >
                    <Text style={styles.openBtnText}>Phóng To QR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scroll: { paddingBottom: 30 },
  noticeBox: {
    backgroundColor: '#78350f25',
    borderWidth: 1,
    borderColor: '#f59e0b40',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
  ticketList: { gap: 14 },
  ticketCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  codeBadge: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  codeText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  qrContainer: { alignItems: 'center', marginVertical: 12 },
  qrPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  qrIcon: { fontSize: 44, color: '#000' },
  qrTokenText: { fontSize: 8, color: '#334155', fontWeight: '700', textAlign: 'center', marginTop: 4 },
  qrSub: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border },
  validText: { fontSize: 10, color: colors.textMuted },
  openBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  openBtnText: { color: '#000', fontWeight: '800', fontSize: 11 },
});
