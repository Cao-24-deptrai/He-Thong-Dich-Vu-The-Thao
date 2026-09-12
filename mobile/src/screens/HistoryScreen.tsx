// mobile/src/screens/HistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { Booking } from '../types';

interface Props {
  onViewTicket: (bookingId: string) => void;
}

export const HistoryScreen: React.FC<Props> = ({ onViewTicket }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err: any) {
      console.error('Failed to load my bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Xác nhận hủy đặt sân',
      'Bạn có chắc chắn muốn hủy đơn đặt chỗ này không? Khung giờ sẽ được giải phóng cho khách hàng khác.',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn ngay',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingId);
            try {
              await api.cancelBooking(bookingId);
              Alert.alert('Thành công', 'Đã hủy đơn đặt chỗ thành công.');
              await fetchBookings();
            } catch (err: any) {
              Alert.alert('Lỗi hủy đơn', err.message);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const filteredBookings = bookings.filter((b) => {
    if (tab === 'UPCOMING') {
      return b.status === 'CONFIRMED' || b.status === 'HELD';
    }
    return b.status !== 'CONFIRMED' && b.status !== 'HELD';
  });

  const getStatusBadge = (status: string, isCheckedIn?: boolean) => {
    if (isCheckedIn) {
      return { label: 'ĐÃ CHECK-IN', bg: '#064e3b', color: '#34d399' };
    }
    switch (status) {
      case 'CONFIRMED':
        return { label: 'ĐÃ THANH TOÁN', bg: '#064e3b', color: '#34d399' };
      case 'HELD':
        return { label: 'ĐANG GIỮ CHỖ', bg: '#78350f', color: '#fbbf24' };
      case 'CANCELLED':
        return { label: 'ĐÃ HỦY', bg: '#7f1d1d', color: '#f87171' };
      case 'EXPIRED':
        return { label: 'QUÁ HẠN', bg: '#334155', color: '#94a3b8' };
      case 'REFUND_PENDING':
        return { label: 'CHỜ HOÀN TIỀN', bg: '#78350f', color: '#f59e0b' };
      case 'REFUNDED':
        return { label: 'ĐÃ HOÀN TIỀN', bg: '#1e3a8a', color: '#60a5fa' };
      default:
        return { label: status, bg: '#334155', color: '#cbd5e1' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lịch Sử Đặt Chỗ</Text>
          <Text style={styles.headerSubtitle}>Quản lý vé đã đặt & theo dõi lịch chơi của bạn</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, tab === 'UPCOMING' && styles.activeTab]}
            onPress={() => setTab('UPCOMING')}
          >
            <Text style={[styles.tabText, tab === 'UPCOMING' && styles.activeTabText]}>
              Sắp tới ({bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'HELD').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab === 'PAST' && styles.activeTab]}
            onPress={() => setTab('PAST')}
          >
            <Text style={[styles.tabText, tab === 'PAST' && styles.activeTabText]}>
              Lịch sử / Đã hủy ({bookings.filter((b) => b.status !== 'CONFIRMED' && b.status !== 'HELD').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải lịch sử đơn đặt...</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>Chưa có đơn đặt nào</Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'UPCOMING'
                ? 'Bạn không có lịch chơi nào sắp tới. Hãy khám phá và đặt sân ngay!'
                : 'Lịch sử giao dịch trống.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const badge = getStatusBadge(item.status, item.isCheckedIn);
              const isConfirmed = item.status === 'CONFIRMED';
              const canCancel = item.status === 'CONFIRMED' || item.status === 'HELD';

              return (
                <View style={styles.bookingCard}>
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.courtName}>
                        {item.venueId?.name || 'Sân Thể Thao'}
                      </Text>
                      <Text style={styles.bookingCode}>
                        Mã đơn: #{item._id.slice(-6).toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardInfoGrid}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Ngày chơi</Text>
                      <Text style={styles.infoVal}>
                        📅 {item.bookingDate ? item.bookingDate.split('T')[0] : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Khung giờ</Text>
                      <Text style={styles.infoValHighlight}>
                        ⏰ {item.startTime} - {item.endTime}
                      </Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Tổng tiền</Text>
                      <Text style={styles.infoValPrice}>
                        {item.totalPrice?.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {canCancel && (
                      <TouchableOpacity
                        disabled={cancellingId === item._id}
                        style={styles.cancelBtn}
                        onPress={() => handleCancelBooking(item._id)}
                      >
                        {cancellingId === item._id ? (
                          <ActivityIndicator size="small" color="#f87171" />
                        ) : (
                          <Text style={styles.cancelBtnText}>Hủy đơn</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {isConfirmed && (
                      <TouchableOpacity
                        style={styles.viewTicketBtn}
                        onPress={() => onViewTicket(item._id)}
                      >
                        <Text style={styles.viewTicketBtnText}>Xem Vé QR 🎟️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 30,
    gap: 14,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bookingCode: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardInfoGrid: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 3,
  },
  infoVal: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  infoValHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  infoValPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    fontFamily: 'monospace',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  viewTicketBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  viewTicketBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
