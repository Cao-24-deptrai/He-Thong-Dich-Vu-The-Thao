import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  TextInput,
} from 'react-native';
import { Clock, CheckCircle2 } from 'lucide-react-native';
import QRCode from 'qrcode';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { useBookingStore } from '../store/useBookingStore';
import { subscribeSlotChanges } from '../socket/socket';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentScreen: React.FC<Props> = ({ onBack, onPaymentSuccess }) => {
  const theme = useTheme();
  const {
    activeBooking,
    selectedFacility,
    selectedVenue,
    setPaymentData,
    appliedVoucher,
    voucherDiscount,
    setAppliedVoucher,
  } = useBookingStore();

  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(600);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const originalPrice = activeBooking?.totalPrice || 0;
  const currentDiscount = appliedVoucher ? voucherDiscount : 0;
  const finalPrice = Math.max(0, originalPrice - currentDiscount);

  useEffect(() => {
    if (!activeBooking) {
      setLoading(false);
      return;
    }

    const generateQr = async () => {
      try {
        setLoading(true);
        const data = await api.createPaymentLink(activeBooking._id);
        setPaymentData(data);
        if (data.qrCode) {
          const url = await QRCode.toDataURL(data.qrCode, {
            width: 240,
            margin: 2,
            color: { dark: '#0B0E0B', light: '#FFFFFF' },
          });
          setQrDataUrl(url);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tạo liên kết thanh toán VietQR.';
        setDialog({ visible: true, title: 'Lỗi tạo thanh toán', message: msg });
      } finally {
        setLoading(false);
      }
    };
    generateQr();
  }, [activeBooking]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!activeBooking) return;
    const unsubscribe = subscribeSlotChanges((data) => {
      if (data.status === 'CONFIRMED') {
        onPaymentSuccess();
      }
    });
    return unsubscribe;
  }, [activeBooking]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code || !activeBooking) return;
    try {
      const validation = await api.validateVoucher(
        code,
        originalPrice,
        selectedVenue?._id,
        selectedFacility?.sportTypes?.[0]
      );
      if (validation.valid && validation.voucher) {
        await api.applyVoucher({
          code,
          bookingId: activeBooking._id,
          orderAmount: originalPrice,
          venueId: selectedVenue?._id,
        });
        setAppliedVoucher(validation.voucher, validation.discountAmount);
        setPromoCodeInput('');
        setDialog({
          visible: true,
          title: 'Áp dụng mã thành công',
          message: `Đã giảm ${validation.discountAmount.toLocaleString('vi-VN')} đ.`,
        });
      } else {
        setDialog({
          visible: true,
          title: 'Mã chưa hợp lệ',
          message: validation.reason || 'Không đủ điều kiện áp dụng mã này.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra mã giảm giá.';
      setDialog({ visible: true, title: 'Lỗi mã giảm giá', message: msg });
    }
  };

  const handleConfirmPaid = async () => {
    if (!activeBooking) return;
    setVerifying(true);
    try {
      const statusRes = await api.getPaymentStatus(activeBooking._id);
      if (statusRes?.status === 'CONFIRMED' || statusRes?.paymentStatus === 'PAID') {
        onPaymentSuccess();
      } else {
        setDialog({
          visible: true,
          title: 'Đang chờ xác nhận',
          message: 'Hệ thống chưa nhận được tín hiệu chuyển khoản từ ngân hàng. Vui lòng hoàn tất quét mã VietQR.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra trạng thái thanh toán.';
      setDialog({ visible: true, title: 'Lỗi kiểm tra thanh toán', message: msg });
    } finally {
      setVerifying(false);
    }
  };

  if (!activeBooking) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Thanh toán VietQR" onBack={onBack} />
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Chưa có đơn đặt sân đang giữ chỗ
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Vui lòng chọn sân và khung giờ trước khi tiến hành thanh toán.
          </Text>
          <Pressable
            onPress={onBack}
            style={[styles.backActionBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.backActionText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
              Chọn khung giờ
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Thanh toán VietQR" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View
          style={[
            styles.timerBanner,
            {
              backgroundColor: theme.accentSecondarySoft,
              borderColor: theme.accentSecondary,
            },
          ]}
        >
          <View style={styles.timerLeft}>
            <Clock size={16} strokeWidth={1.75} color={theme.accentSecondary} />
            <Text style={[styles.timerLabel, { color: theme.textHeading, fontFamily: fonts.bodyMedium }]}>
              Thời gian khóa giữ chỗ còn lại
            </Text>
          </View>
          <Text style={[styles.timerClock, { color: theme.accentSecondary, fontFamily: fonts.headingBold }]}>
            {mins}:{secs}
          </Text>
        </View>

        <View style={[styles.qrCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.qrTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Quét mã VietQR PayOS
          </Text>
          <Text style={[styles.qrSubtitle, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Hệ thống tự động xác nhận giao dịch trong 3 giây
          </Text>

          <View style={styles.qrWhiteBox}>
            {loading || !qrDataUrl ? (
              <ActivityIndicator color="#16A34A" />
            ) : (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
            )}
          </View>

          <Text style={[styles.amountText, { color: theme.accent, fontFamily: fonts.headingBold }]}>
            {finalPrice.toLocaleString('vi-VN')} đ
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Chi tiết đơn đặt sân
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Cơ sở
            </Text>
            <Text style={[styles.detailVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
              {selectedFacility?.name || 'Phanta Sports'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Sân thi đấu
            </Text>
            <Text style={[styles.detailVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
              {selectedVenue?.name || activeBooking.venueId}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Giảm giá voucher
            </Text>
            <Text style={[styles.detailVal, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              -{currentDiscount.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Nhập mã giảm giá
          </Text>
          <View style={styles.promoRow}>
            <TextInput
              value={promoCodeInput}
              onChangeText={setPromoCodeInput}
              placeholder="Nhập mã voucher"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              style={[
                styles.promoInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.textHeading,
                  fontFamily: fonts.bodyMedium,
                },
              ]}
            />
            <Pressable
              onPress={handleApplyPromo}
              style={({ pressed }) => [
                styles.applyBtn,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.applyBtnText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                Áp dụng
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleConfirmPaid}
          disabled={verifying}
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: theme.accent, opacity: verifying ? 0.6 : pressed ? 0.85 : 1 },
          ]}
        >
          {verifying ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <>
              <CheckCircle2 size={18} strokeWidth={1.75} color={theme.onAccent} />
              <Text style={[styles.confirmBtnText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                Kiểm tra trạng thái thanh toán
              </Text>
            </>
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
  emptyWrap: { flex: 1, padding: spacing.xxl, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
  backActionBtn: { minHeight: 44, paddingHorizontal: spacing.xl, borderRadius: radius.md, justifyContent: 'center' },
  backActionText: { fontSize: 13 },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  timerBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timerLabel: { fontSize: 13 },
  timerClock: { fontSize: 18 },
  qrCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrTitle: { fontSize: 18 },
  qrSubtitle: { fontSize: 12, textAlign: 'center' },
  qrWhiteBox: {
    width: 210,
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  qrImage: { width: '100%', height: '100%' },
  amountText: { fontSize: 24 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  sectionTitle: { fontSize: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  detailLabel: { fontSize: 12 },
  detailVal: { fontSize: 13 },
  promoRow: { flexDirection: 'row', gap: spacing.sm },
  promoInput: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 13 },
  applyBtn: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { fontSize: 13 },
  confirmBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  confirmBtnText: { fontSize: 14 },
});
