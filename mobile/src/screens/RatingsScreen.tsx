import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Star, AlertTriangle } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
}

const CRITERIA = [
  { key: 'facilityRating', title: '1. Mặt sân và cơ sở vật chất', desc: 'Cỏ nhân tạo, dàn đèn LED 500 Lux, lưới khung thành' },
  { key: 'cleanlinessRating', title: '2. Tiện ích và vệ sinh', desc: 'Phòng thay đồ, tắm nóng lạnh, nước uống sạch' },
  { key: 'staffRating', title: '3. Thái độ nhân viên và trọng tài', desc: 'Lễ tân hỗ trợ, trọng tài điều hành công tâm' },
  { key: 'serviceRating', title: '4. Dụng cụ và chất lượng dịch vụ', desc: 'Bóng FIFA Pro, áo bib thi đấu sạch sẽ' },
] as const;

export const RatingsScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [scores, setScores] = useState<Record<string, number>>({
    facilityRating: 5,
    cleanlinessRating: 5,
    staffRating: 5,
    serviceRating: 5,
  });
  const [summary, setSummary] = useState<any>(null);
  const [latestBooking, setLatestBooking] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    api.getReviewSummary().then(setSummary).catch(() => null);
    api
      .getMyBookings()
      .then((list) => {
        const completed = list.find((b) => b.status === 'COMPLETED') || list[0];
        setLatestBooking(completed || null);
      })
      .catch(() => null);
  }, []);

  const handleSubmit = async () => {
    if (!latestBooking) {
      setDialog({
        visible: true,
        title: 'Chưa có đơn hoàn thành',
        message: 'Bạn cần có ít nhất 1 đơn đặt sân đã hoàn tất để gửi đánh giá.',
      });
      return;
    }
    if (!comment.trim()) {
      setDialog({
        visible: true,
        title: 'Thiếu nội dung nhận xét',
        message: 'Vui lòng nhập nhận xét chi tiết trước khi gửi.',
      });
      return;
    }
    try {
      setSubmitting(true);
      await api.createReview({
        bookingId: latestBooking._id,
        facilityRating: scores.facilityRating,
        serviceRating: scores.serviceRating,
        staffRating: scores.staffRating,
        cleanlinessRating: scores.cleanlinessRating,
        comment: comment.trim(),
      });
      setComment('');
      const updated = await api.getReviewSummary().catch(() => null);
      if (updated) setSummary(updated);
      setDialog({
        visible: true,
        title: 'Đã gửi đánh giá thành công',
        message: 'Cảm ơn bạn đã đóng góp ý kiến để cải thiện chất lượng dịch vụ.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi đánh giá lúc này.';
      setDialog({ visible: true, title: 'Không thể gửi đánh giá', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const avgDisplay = summary?.averageOverall ? Number(summary.averageOverall).toFixed(1) : '--';
  const totalReviews = summary?.totalReviews ?? 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Đánh giá chất lượng dịch vụ" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {latestBooking ? (
          <View style={[styles.sessionCard, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sessionTag, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                Đơn đặt sân gần nhất
              </Text>
              <Text style={[styles.sessionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                {latestBooking.venueId?.name || 'Sân Phanta Sports'}
              </Text>
              <Text style={[styles.sessionTime, { color: theme.accent, fontFamily: fonts.bodyMedium }]}>
                {latestBooking.startTime} - {latestBooking.endTime} ({latestBooking.bookingDate})
              </Text>
              <Text style={[styles.sessionCode, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Mã đặt: #{latestBooking._id.slice(-8).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.checkoutBadge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.checkoutText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                {latestBooking.status}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.avgScore, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            {avgDisplay} <Text style={{ color: theme.warning, fontSize: 16, fontFamily: fonts.headingBold }}>/ 5.0</Text>
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} strokeWidth={1.75} color={theme.warning} fill={theme.warning} />
            ))}
          </View>
          <Text style={[styles.summarySub, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Dựa trên {totalReviews.toLocaleString('vi-VN')} lượt đánh giá từ hệ thống
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
          4 Tiêu chí đánh giá chất lượng
        </Text>

        {CRITERIA.map((c) => {
          const current = scores[c.key] || 5;
          return (
            <View
              key={c.key}
              style={[styles.criteriaCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.criteriaTitle, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                  {c.title}
                </Text>
                <Text style={[styles.criteriaDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  {c.desc}
                </Text>
              </View>
              <View style={styles.starInputRow}>
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <Pressable
                    key={starVal}
                    onPress={() => setScores((p) => ({ ...p, [c.key]: starVal }))}
                    accessibilityLabel={`Chấm ${starVal} sao`}
                    style={styles.starBtn}
                  >
                    <Star
                      size={18}
                      strokeWidth={1.75}
                      color={starVal <= current ? theme.warning : theme.borderLight}
                      fill={starVal <= current ? theme.warning : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        <View
          style={[
            styles.alertBox,
            { backgroundColor: theme.accentSecondarySoft, borderColor: theme.accentSecondary },
          ]}
        >
          <View style={styles.alertHeader}>
            <AlertTriangle size={15} strokeWidth={1.75} color={theme.accentSecondary} />
            <Text style={[styles.alertTitle, { color: theme.accentSecondary, fontFamily: fonts.bodySemiBold }]}>
              Cơ chế kiểm soát chất lượng dịch vụ
            </Text>
          </View>
          <Text style={[styles.alertDesc, { color: theme.textPrimary, fontFamily: fonts.body }]}>
            Nếu điểm trung bình từ 2 sao trở xuống, hệ thống tự động gửi cảnh báo đến Ban Quản Lý để liên hệ xử lý trong 15 phút.
          </Text>
        </View>

        <View style={styles.commentWrap}>
          <Text style={[styles.commentLabel, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
            Nhận xét chi tiết
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            placeholder="Chia sẻ trải nghiệm thi đấu của bạn tại cụm sân"
            placeholderTextColor={theme.placeholder}
            style={[
              styles.textarea,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.textHeading,
                fontFamily: fonts.body,
              },
            ]}
          />
        </View>

        <Pressable
          disabled={submitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: theme.accentSecondary, opacity: submitting ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.onAccentSecondary} />
          ) : (
            <Text style={[styles.submitText, { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold }]}>
              Gửi đánh giá chất lượng
            </Text>
          )}
        </Pressable>
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
  sessionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sessionTag: { fontSize: 11 },
  sessionTitle: { fontSize: 16, marginTop: 2 },
  sessionTime: { fontSize: 12, marginTop: 2 },
  sessionCode: { fontSize: 11, marginTop: 2 },
  checkoutBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  checkoutText: { fontSize: 11 },
  summaryCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: 6 },
  avgScore: { fontSize: 28 },
  starsRow: { flexDirection: 'row', gap: 4 },
  summarySub: { fontSize: 11 },
  sectionTitle: { fontSize: 15, marginTop: spacing.xs },
  criteriaCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  criteriaTitle: { fontSize: 13 },
  criteriaDesc: { fontSize: 11, marginTop: 2 },
  starInputRow: { flexDirection: 'row', gap: 2 },
  starBtn: { padding: 3 },
  alertBox: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertTitle: { fontSize: 12 },
  alertDesc: { fontSize: 12, lineHeight: 17 },
  commentWrap: { gap: 6 },
  commentLabel: { fontSize: 12 },
  textarea: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  submitBtn: { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14 },
});
