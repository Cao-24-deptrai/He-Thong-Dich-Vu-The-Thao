import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { WifiOff, ChevronRight } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { Booking } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack?: () => void;
  onOpenTicket?: () => void;
}

const OFFLINE_CACHE_KEY = 'phanta_offline_booking';

export const OfflineScreen: React.FC<Props> = ({ onBack, onOpenTicket }) => {
  const theme = useTheme();
  const [cachedBooking, setCachedBooking] = useState<Booking | null>(null);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const syncOfflinePack = async () => {
    try {
      const bookings = await api.getMyBookings();
      const confirmed = bookings.find((b) => b.status === 'CONFIRMED') || bookings[0] || null;
      if (confirmed) {
        setCachedBooking(confirmed);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(confirmed));
        }
        return;
      }
    } catch {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(OFFLINE_CACHE_KEY);
        if (raw) {
          try {
            setCachedBooking(JSON.parse(raw));
          } catch {
            setCachedBooking(null);
          }
        }
      }
    }
  };

  useEffect(() => {
    syncOfflinePack();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Chế độ ngoại tuyến" onBack={onBack} />

      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: theme.accentSecondarySoft, borderColor: theme.accentSecondary }]}>
          <WifiOff size={36} strokeWidth={1.75} color={theme.accentSecondary} />
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Gói vé ngoại tuyến (Offline Pack)
          </Text>
          <Text style={[styles.desc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Vé QR đã lưu cục bộ và dữ liệu Face ID mở cổng Gym vẫn hoạt động độc lập ngay cả khi mất kết nối Internet.
          </Text>
        </View>

        {cachedBooking ? (
          <View style={[styles.ticketPreview, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
            <View style={styles.previewTop}>
              <Text style={[styles.previewTag, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                Gói vé ngoại tuyến đã lưu
              </Text>
              <View style={[styles.hmacBadge, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.hmacText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                  Sẵn sàng
                </Text>
              </View>
            </View>
            <Text style={[styles.courtName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
              {(cachedBooking as any).venueId?.name || 'Đơn đặt sân đã xác nhận'}
            </Text>
            <Text style={[styles.courtTime, { color: theme.accent, fontFamily: fonts.bodyMedium }]}>
              {cachedBooking.startTime} - {cachedBooking.endTime} ({cachedBooking.bookingDate})
            </Text>
            <Text style={[styles.orderCode, { color: theme.textMuted, fontFamily: fonts.body }]}>
              Mã đơn: #{cachedBooking._id.slice(-8).toUpperCase()}
            </Text>
          </View>
        ) : (
          <View style={[styles.ticketPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.orderCode, { color: theme.textSecondary, fontFamily: fonts.body, textAlign: 'center' }]}>
              Chưa có vé nào được đồng bộ cục bộ. Hãy đăng nhập và đặt sân để lưu vé ngoại tuyến.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={onOpenTicket}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.primaryText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
              Mở vé QR ngoại tuyến
            </Text>
            <ChevronRight size={16} strokeWidth={2} color={theme.onAccent} />
          </Pressable>

          <Pressable
            onPress={async () => {
              await syncOfflinePack();
              setDialog({
                visible: true,
                title: 'Đồng bộ hoàn tất',
                message: 'Đã kiểm tra và cập nhật dữ liệu vé ngoại tuyến mới nhất từ máy chủ.',
              });
            }}
            style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.retryText, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
              Đồng bộ lại dữ liệu
            </Text>
          </Pressable>
        </View>
      </View>

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
  container: {
    flex: 1,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 20, textAlign: 'center' },
  desc: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  ticketPreview: { width: '100%', borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: 4 },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  previewTag: { fontSize: 11 },
  hmacBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  hmacText: { fontSize: 10 },
  courtName: { fontSize: 16 },
  courtTime: { fontSize: 13 },
  orderCode: { fontSize: 11, marginTop: 4 },
  actions: { width: '100%', gap: spacing.sm },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryText: { fontSize: 14 },
  retryBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontSize: 13 },
});
