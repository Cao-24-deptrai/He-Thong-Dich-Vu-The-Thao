// mobile/src/screens/ProcessScreen.tsx
import React from 'react';
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

interface ProcessStep {
  step: number;
  title: string;
  desc: string;
  badge: string;
}

export const ProcessScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const steps: ProcessStep[] = [
    {
      step: 1,
      title: 'Bước 1: Chọn Sân & Khung Giờ',
      desc: 'Ma trận khung giờ 30 phút. Hệ thống tự động khóa giữ chỗ 10 phút chống trùng lặp tuyệt đối.',
      badge: 'KHÓA 10 PHÚT',
    },
    {
      step: 2,
      title: 'Bước 2: Thuê Dụng Cụ & Áp Mã Giảm Giá',
      desc: 'Chọn thêm bóng thi đấu, áo bib phân đội hoặc vợt cầu lông và áp dụng voucher ưu đãi.',
      badge: 'TIỆN ÍCH',
    },
    {
      step: 3,
      title: 'Bước 3: Thanh Toán Siêu Tốc',
      desc: 'Khấu trừ ví nội bộ Phanta Pay hoặc quét mã chuyển khoản VietQR PayOS ngân hàng tự động.',
      badge: 'VIETQR / VÍ',
    },
    {
      step: 4,
      title: 'Bước 4: Nhận Vé Điện Tử Apple Wallet',
      desc: 'Mã QR động bảo mật tự xoay vòng làm mới mỗi 60 giây chống chụp màn hình và gian lận vé.',
      badge: 'QR ĐỘNG 60S',
    },
    {
      step: 5,
      title: 'Bước 5: Quét Mã & Vào Sân Qua Cổng Turnstile',
      desc: 'Đưa mã QR trước mắt đọc cổng xoay Turnstile, cổng barrier tự động nhả chốt mở trong chưa đầy 1 giây.',
      badge: 'CỔNG TỰ ĐỘNG',
    },
    {
      step: 6,
      title: 'Bước 6: Hoàn Tất & Đánh Giá 4 Tiêu Chí',
      desc: 'Đánh giá chất lượng mặt sân, ánh sáng, dịch vụ, vệ sinh và tích điểm nâng hạng hội viên Gold.',
      badge: 'TÍCH ĐIỂM',
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
            primary="Quy Trình 6 Bước Thông Minh"
            secondary="Hướng dẫn trải nghiệm dịch vụ thể thao từ A - Z"
            badge="6 BƯỚC"
            badgeColor={colors.primary}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Timeline Steps */}
          <View style={styles.stepsList}>
            {steps.map((st) => (
              <View key={st.step} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNum}>{st.step}</Text>
                  </View>
                  <View style={styles.stepTitleBox}>
                    <TwoLineText
                      primary={st.title}
                      secondary={st.desc}
                      primaryStyle={{ fontSize: 14 }}
                      secondaryStyle={{ fontSize: 12, lineHeight: 18 }}
                    />
                  </View>
                </View>
                <View style={styles.badgeRow}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{st.badge}</Text>
                  </View>
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
  stepsList: { gap: 14 },
  stepCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  stepHeader: { flexDirection: 'row', gap: 12 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: { fontSize: 16, fontWeight: '900', color: '#000' },
  stepTitleBox: { flex: 1 },
  badgeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  tagBadge: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
});
