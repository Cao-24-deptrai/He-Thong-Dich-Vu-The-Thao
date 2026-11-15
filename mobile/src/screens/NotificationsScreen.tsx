import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { NotificationItem } from '../types';

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const filterTabs = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'WALLET_BALANCE', label: 'Số dư ví' },
    { id: 'BOOKING_UPDATE', label: 'Đặt sân' },
    { id: 'INVOICE_VAT', label: 'Hóa đơn VAT' },
    { id: 'MATCHMAKING', label: 'Cáp kèo' },
  ];

  useEffect(() => {
    loadNotifications();
  }, [selectedFilter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getMyNotifications(
        false,
        selectedFilter === 'ALL' ? undefined : selectedFilter,
      );

      if (res?.items && Array.isArray(res.items)) {
        setNotifications(res.items);
      } else {
        // Fallback demo notifications
        setNotifications([
          {
            _id: 'notif-1',
            title: 'Biến động số dư: +200,000 đ',
            body: 'Bạn đã nạp thành công 200,000 đ vào ví Phanta Pay qua Napas VietQR.',
            type: 'WALLET_BALANCE',
            channel: 'FCM',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'notif-2',
            title: 'Hóa đơn điện tử VAT đã được phát hành',
            body: 'Hóa đơn HD26-001001 đã được cấp mã CQT thành công. Thuế suất 8%.',
            type: 'INVOICE_VAT',
            channel: 'IN_APP',
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            _id: 'notif-3',
            title: 'Nhắc lịch đặt sân: Sân bóng 7 người (18:00)',
            body: 'Trận bóng của bạn bắt đầu sau 60 phút tại Cơ sở Quận 7. Vé QR đã kích hoạt.',
            type: 'BOOKING_UPDATE',
            channel: 'FCM',
            isRead: true,
            createdAt: new Date(Date.now() - 14400000).toISOString(),
          },
          {
            _id: 'notif-4',
            title: 'Có đối thủ mới tìm kèo giao hữu!',
            body: 'FC Saigon Red vừa nhận lời cáp kèo Pickleball đôi nam của bạn.',
            type: 'MATCHMAKING',
            channel: 'ZNS',
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc!');
    } catch (e) {
      console.error(e);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'WALLET_BALANCE':
        return colors.volt;
      case 'INVOICE_VAT':
        return colors.warning;
      case 'BOOKING_UPDATE':
        return colors.primary;
      case 'MATCHMAKING':
        return '#ea580c';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Trung Tâm Thông Báo</Text>
          <Text style={styles.subtitle}>Đa kênh FCM • Zalo ZNS • Outbox Queue (E10)</Text>
        </View>

        <TouchableOpacity style={styles.readAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.readAllText}>Đọc tất cả ✓</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.filterChip, selectedFilter === tab.id && styles.filterChipActive]}
            onPress={() => setSelectedFilter(tab.id)}
          >
            <Text style={[styles.filterText, selectedFilter === tab.id && styles.filterTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list}>
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Không có thông báo nào trong mục này</Text>
            </View>
          ) : (
            notifications.map((notif) => {
              const badgeColor = getBadgeColor(notif.type);
              return (
                <TouchableOpacity
                  key={notif._id}
                  style={[styles.notifCard, !notif.isRead && styles.unreadCard]}
                  onPress={() => handleMarkAsRead(notif._id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notifHeader}>
                    <View style={styles.typeBadge}>
                      <View style={[styles.typeDot, { backgroundColor: badgeColor }]} />
                      <Text style={[styles.typeText, { color: badgeColor }]}>{notif.type}</Text>
                    </View>

                    <Text style={styles.notifTime}>
                      {new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <Text style={[styles.notifTitle, !notif.isRead && styles.unreadTitle]}>
                    {notif.title}
                  </Text>

                  <Text style={styles.notifBody}>{notif.body}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  readAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  readAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  filterScroll: {
    maxHeight: 40,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#090d16',
  },
  list: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  notifCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  unreadCard: {
    borderColor: 'rgba(0, 242, 254, 0.35)',
    backgroundColor: '#131b2e',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  notifTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#ffffff',
    fontWeight: '900',
  },
  notifBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
