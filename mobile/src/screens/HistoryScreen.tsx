import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { QrCode, Calendar } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { Booking } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack?: () => void;
  onViewTicket: (bookingId: string) => void;
}

export const HistoryScreen: React.FC<Props> = ({ onBack, onViewTicket }) => {
  const theme = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load my bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      setDialog({
        visible: true,
        title: 'Đã hủy đơn đặt sân',
        message: 'Khung giờ đã được giải phóng và tiền cọc được hoàn trả theo quy định.',
      });
      await fetchBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy đơn này.';
      setDialog({ visible: true, title: 'Không thể hủy đơn', message: msg });
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = bookings.filter((b) =>
    tab === 'UPCOMING'
      ? b.status === 'CONFIRMED' || b.status === 'HELD'
      : b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'EXPIRED'
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Lịch sử đặt sân" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.tabRow}>
          {[
            { key: 'UPCOMING' as const, label: 'Sắp tới' },
            { key: 'PAST' as const, label: 'Đã hoàn thành / Hủy' },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: active ? theme.accent : theme.surfaceElevated,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? theme.onAccent : theme.textSecondary, fontFamily: fonts.bodySemiBold },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Calendar size={28} strokeWidth={1.5} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Chưa có đơn đặt sân nào trong mục này.
            </Text>
          </View>
        ) : (
          filtered.map((b: any) => {
            const isConfirmed = b.status === 'CONFIRMED';
            return (
              <View
                key={b._id}
                style={[styles.bookingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.bookingId, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                    #{b._id.slice(-8).toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isConfirmed ? theme.successSoft : theme.warningSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isConfirmed ? theme.success : theme.warning, fontFamily: fonts.bodySemiBold },
                      ]}
                    >
                      {b.status === 'CONFIRMED'
                        ? 'Đã xác nhận'
                        : b.status === 'HELD'
                          ? 'Đang giữ chỗ'
                          : b.status === 'COMPLETED'
                            ? 'Hoàn thành'
                            : 'Đã hủy'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.venueTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                  {b.venueId?.name || 'Đơn đặt sân Phanta Sports'}
                </Text>

                <View style={[styles.metaBox, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Ngày thi đấu
                    </Text>
                    <Text style={[styles.metaVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                      {b.bookingDate}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Khung giờ
                    </Text>
                    <Text style={[styles.metaVal, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                      {b.startTime} - {b.endTime}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Tổng tiền
                    </Text>
                    <Text style={[styles.metaVal, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                      {(b.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>

                {tab === 'UPCOMING' ? (
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => onViewTicket(b._id)}
                      style={({ pressed }) => [
                        styles.qrBtn,
                        { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <QrCode size={15} strokeWidth={1.75} color={theme.onAccent} />
                      <Text style={[styles.qrBtnText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                        Mở vé QR
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={cancellingId === b._id}
                      onPress={() => handleCancelBooking(b._id)}
                      style={({ pressed }) => [
                        styles.cancelBtn,
                        {
                          borderColor: theme.danger,
                          backgroundColor: theme.dangerSoft,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.cancelText, { color: theme.danger, fontFamily: fonts.bodySemiBold }]}>
                        {cancellingId === b._id ? 'Đang hủy' : 'Hủy đơn'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
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
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tabBtn: { flex: 1, minHeight: 42, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12 },
  emptyCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 13, textAlign: 'center' },
  bookingCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingId: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontSize: 11 },
  venueTitle: { fontSize: 16 },
  metaBox: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 12 },
  metaVal: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  qrBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  qrBtnText: { fontSize: 13 },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 12 },
});
