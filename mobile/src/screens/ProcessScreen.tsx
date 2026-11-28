import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ArrowDown } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { ScreenHeader } from '../components/ScreenHeader';

interface Props {
  onBack: () => void;
  onStartBooking?: () => void;
}

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Bước 1 - Khóa giữ chỗ 10 phút',
    desc: 'Chọn môn thể thao, ngày thi đấu và khung giờ 30 phút. Hệ thống khóa giữ chỗ tạm thời trong 10 phút để ngăn đặt trùng sân.',
    tone: 'accent' as const,
  },
  {
    num: '02',
    title: 'Bước 2 - Thanh toán và ký quỹ bảo đảm',
    desc: 'Quét mã VietQR khớp lệnh tự động sau 3 giây hoặc dùng Ví Phanta Pay. Tiền cọc thuê bóng, áo phân đội được giữ trên tài khoản ký quỹ.',
    tone: 'secondary' as const,
  },
  {
    num: '03',
    title: 'Bước 3 - Cấp vé QR động và thẻ Face ID',
    desc: 'Xuất vé điện tử QR xoay vòng mỗi 60 giây và nạp sẵn gói 10 vé ngoại tuyến. Hội viên Gym được đồng bộ dữ liệu Face ID.',
    tone: 'accent' as const,
  },
  {
    num: '04',
    title: 'Bước 4 - Mở cổng tự động vào sân',
    desc: 'Quét mã vé tại cổng barrier hoặc đứng trước camera nhận diện khuôn mặt. Cổng mở trong 0.5 giây không cần soát vé giấy.',
    tone: 'success' as const,
  },
  {
    num: '05',
    title: 'Bước 5 - Nhận và trả dụng cụ thi đấu',
    desc: 'Nhận bóng và áo phân đội tại quầy thể thao. Sau trận đấu, nhân viên quét mã đối soát nhận lại dụng cụ trong 30 giây.',
    tone: 'warning' as const,
  },
  {
    num: '06',
    title: 'Bước 6 - Hoàn tiền cọc và đánh giá',
    desc: 'Tiền cọc dụng cụ tự động hoàn về ví trong 3 giây. Khách hàng chấm điểm trải nghiệm theo 4 tiêu chí chất lượng.',
    tone: 'accent' as const,
  },
];

export const ProcessScreen: React.FC<Props> = ({ onBack, onStartBooking }) => {
  const theme = useTheme();

  const getColor = (tone: (typeof PROCESS_STEPS)[number]['tone']) => {
    switch (tone) {
      case 'secondary':
        return theme.accentSecondary;
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      default:
        return theme.accent;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Sơ đồ quy trình 6 bước" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Quy trình trải nghiệm dịch vụ
          </Text>
          <Text style={[styles.introSub, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Chuẩn hóa 6 bước từ khóa chỗ, thanh toán đến mở cổng và hoàn cọc
          </Text>
        </View>

        {PROCESS_STEPS.map((step, idx) => {
          const badgeColor = getColor(step.tone);
          return (
            <View key={step.num}>
              <View
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderLeftColor: badgeColor,
                  },
                ]}
              >
                <View style={styles.stepTop}>
                  <View style={[styles.numBox, { backgroundColor: badgeColor }]}>
                    <Text style={[styles.numText, { color: theme.onAccent, fontFamily: fonts.headingBold }]}>
                      {step.num}
                    </Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                    {step.title}
                  </Text>
                </View>
                <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  {step.desc}
                </Text>
              </View>

              {idx < PROCESS_STEPS.length - 1 ? (
                <View style={styles.connector}>
                  <View style={[styles.connectorLine, { backgroundColor: theme.borderLight }]} />
                  <ArrowDown size={14} strokeWidth={1.75} color={theme.textMuted} />
                </View>
              ) : null}
            </View>
          );
        })}

        <Pressable
          onPress={onStartBooking}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
            Bắt đầu đặt sân theo quy trình
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  intro: { alignItems: 'center', marginBottom: spacing.md, gap: 4 },
  introTitle: { fontSize: 18 },
  introSub: { fontSize: 12, textAlign: 'center' },
  stepCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 12 },
  stepTitle: { fontSize: 14, flex: 1 },
  stepDesc: { fontSize: 12, lineHeight: 18, paddingLeft: 36 },
  connector: { alignItems: 'center', paddingVertical: 4 },
  connectorLine: { width: 1, height: 10 },
  ctaBtn: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  ctaText: { fontSize: 14 },
});
