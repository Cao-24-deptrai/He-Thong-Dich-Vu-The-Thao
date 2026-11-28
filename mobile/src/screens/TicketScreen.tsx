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
} from 'react-native';
import { CheckCircle2, RefreshCw } from 'lucide-react-native';
import QRCode from 'qrcode';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { QrTokenResponse } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  bookingId?: string;
  onBack: () => void;
}

export const TicketScreen: React.FC<Props> = ({ bookingId, onBack }) => {
  const theme = useTheme();
  const { activeBooking } = useBookingStore();
  const [resolvedId, setResolvedId] = useState<string | undefined>(bookingId || activeBooking?._id);
  const [ticketData, setTicketData] = useState<QrTokenResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (bookingId || activeBooking?._id) {
      setResolvedId(bookingId || activeBooking?._id);
      return;
    }
    api
      .getMyBookings()
      .then((list) => {
        const confirmed = list.find((b) => b.status === 'CONFIRMED') || list[0];
        if (confirmed) {
          setResolvedId(confirmed._id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [bookingId, activeBooking]);

  const fetchDynamicQr = async (id: string) => {
    try {
      setErrorMsg(null);
      const res = await api.getDynamicQr(id);
      setTicketData(res);
      setSecondsRemaining(res.expiresInSeconds || 60);

      const url = await QRCode.toDataURL(res.qrToken, {
        width: 240,
        margin: 1,
        color: { dark: '#0B0E0B', light: '#FFFFFF' },
      });
      setQrDataUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải vé QR cho đơn này.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!resolvedId) return;
    fetchDynamicQr(resolvedId);
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchDynamicQr(resolvedId);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resolvedId]);

  const handleScanCheckin = async () => {
    if (!ticketData?.qrToken) return;
    try {
      await api.scanCheckin(ticketData.qrToken);
      setDialog({
        visible: true,
        title: 'Mở cổng thành công',
        message: 'Hệ thống đã xác nhận check-in hợp lệ và mở cổng vào sân.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể quét mã check-in.';
      setDialog({ visible: true, title: 'Thông báo check-in', message: msg });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Vé điện tử vào sân" onBack={onBack} />
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resolvedId || errorMsg) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Vé điện tử vào sân" onBack={onBack} />
        <View style={styles.centerState}>
          <Text style={[styles.emptyTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Chưa có vé đặt sân khả dụng
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            {errorMsg || 'Bạn cần đăng nhập và hoàn tất thanh toán 1 đơn đặt sân để nhận vé QR.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const bookingInfo = ticketData?.booking;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Vé điện tử vào sân"
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Bảo mật HMAC-SHA256',
                message: 'Mã QR tự động xoay vòng mỗi 60 giây nhằm chống chụp màn hình chia sẻ vé.',
              })
            }
          >
            <Text style={[styles.secTag, { color: theme.accent, fontFamily: fonts.headingBold }]}>
              SEC-02
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={[styles.ticketCard, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
          <View style={[styles.ticketTop, { borderBottomColor: theme.borderSubtle }]}>
            <View>
              <Text style={[styles.metaLabel, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                Mã đơn hàng
              </Text>
              <Text style={[styles.orderCode, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                #{resolvedId.slice(-8).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: theme.successSoft }]}>
              <Text style={[styles.statusText, { color: theme.success, fontFamily: fonts.bodySemiBold }]}>
                {ticketData?.isCheckedIn ? 'Đã check-in' : 'Sẵn sàng vào sân'}
              </Text>
            </View>
          </View>

          <View style={styles.qrArea}>
            <View style={[styles.qrOuterRing, { borderColor: theme.accent }]}>
              <View style={styles.qrInnerBox}>
                {qrDataUrl ? (
                  <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
                ) : (
                  <ActivityIndicator color="#16A34A" />
                )}
              </View>
            </View>
            <Text style={[styles.countdownText, { color: theme.textHeading, fontFamily: fonts.bodyMedium }]}>
              Tự làm mới sau:{' '}
              <Text style={{ color: theme.accent, fontFamily: fonts.headingBold }}>
                {secondsRemaining}s
              </Text>
            </Text>
          </View>

          <View style={[styles.detailsBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderSubtle }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Sân thi đấu
              </Text>
              <Text style={[styles.detailVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                {bookingInfo?.venue?.name || 'Sân đã đặt'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Khung giờ
              </Text>
              <Text style={[styles.detailVal, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                {bookingInfo ? `${bookingInfo.startTime} - ${bookingInfo.endTime}` : '--'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Ngày thi đấu
              </Text>
              <Text style={[styles.detailVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                {bookingInfo?.bookingDate || '--'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Tổng thanh toán
              </Text>
              <Text style={[styles.detailVal, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                {(bookingInfo?.totalPrice || 0).toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleScanCheckin}
              style={({ pressed }) => [
                styles.primaryCta,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <CheckCircle2 size={18} strokeWidth={1.75} color={theme.onAccent} />
              <Text style={[styles.primaryCtaText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                Quét mã mở cổng vào sân
              </Text>
            </Pressable>

            <Pressable
              onPress={() => fetchDynamicQr(resolvedId)}
              style={({ pressed }) => [
                styles.outlineBtn,
                { borderColor: theme.border, backgroundColor: theme.surfaceElevated, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <RefreshCw size={15} strokeWidth={1.75} color={theme.textPrimary} />
              <Text style={[styles.outlineText, { color: theme.textPrimary, fontFamily: fonts.bodyMedium }]}>
                Làm mới mã QR
              </Text>
            </Pressable>
          </View>
        </View>
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
  centerState: { flex: 1, padding: spacing.xxl, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 17, textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  secTag: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  ticketCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  metaLabel: { fontSize: 11 },
  orderCode: { fontSize: 18, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: 11 },
  qrArea: { alignItems: 'center', gap: spacing.sm },
  qrOuterRing: {
    width: 190,
    height: 190,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  qrInnerBox: {
    width: 168,
    height: 168,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  qrImage: { width: '100%', height: '100%' },
  countdownText: { fontSize: 13 },
  detailsBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  detailLabel: { fontSize: 12 },
  detailVal: { fontSize: 12 },
  actions: { gap: spacing.sm },
  primaryCta: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryCtaText: { fontSize: 14 },
  outlineBtn: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineText: { fontSize: 12 },
});
