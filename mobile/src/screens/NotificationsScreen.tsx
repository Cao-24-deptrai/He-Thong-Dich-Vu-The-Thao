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
import { Bell, Check } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import type { ScreenId } from '../../App';

interface Props {
  onBack: () => void;
  onNavigate?: (screen: ScreenId) => void;
}

export const NotificationsScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getMyNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const filtered = notifications.filter((n) =>
    filter === 'UNREAD' ? !n.isRead : true
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Trung tâm thông báo"
        onBack={onBack}
        rightElement={
          <Pressable onPress={handleMarkAllRead}>
            <Text style={[styles.readAllText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              Đã đọc tất cả
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.filterRow}>
          {[
            { key: 'ALL' as const, label: `Tất cả (${notifications.length})` },
            {
              key: 'UNREAD' as const,
              label: `Chưa đọc (${notifications.filter((n) => !n.isRead).length})`,
            },
          ].map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.accent : theme.surfaceElevated,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? theme.onAccent : theme.textPrimary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Chưa có thông báo nào trong hộp thư của bạn.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <Pressable
                key={item._id}
                onPress={() => handleMarkRead(item._id)}
                style={({ pressed }) => [
                  styles.notifCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: item.isRead ? theme.border : theme.borderAccent,
                    opacity: pressed ? 0.85 : item.isRead ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.notifTop}>
                  <View style={styles.notifTitleRow}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: item.isRead ? theme.surfaceElevated : theme.accentSoft },
                      ]}
                    >
                      {item.isRead ? (
                        <Check size={14} strokeWidth={1.75} color={theme.textMuted} />
                      ) : (
                        <Bell size={14} strokeWidth={1.75} color={theme.accent} />
                      )}
                    </View>
                    <Text style={[styles.notifTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                      {item.title || 'Thông báo hệ thống'}
                    </Text>
                  </View>
                  <Text style={[styles.notifTime, { color: theme.textMuted, fontFamily: fonts.body }]}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                  </Text>
                </View>
                <Text style={[styles.notifDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                  {item.body || item.message || ''}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  readAllText: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center' },
  filterText: { fontSize: 12 },
  emptyBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  list: { gap: spacing.sm },
  notifCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconBox: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 14, flex: 1 },
  notifTime: { fontSize: 10 },
  notifDesc: { fontSize: 12, lineHeight: 18, paddingLeft: 36 },
});
