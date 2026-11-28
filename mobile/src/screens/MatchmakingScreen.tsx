import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Users } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack?: () => void;
}

export const MatchmakingScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<'ALL' | 'FOOTBALL' | 'BADMINTON' | 'TENNIS'>('ALL');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadMatches = async (sport: string) => {
    try {
      setLoading(true);
      const data = await api.getMatchRequests(sport === 'ALL' ? undefined : sport);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load match requests:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches(filter);
  }, [filter]);

  const handleJoin = async (matchId: string) => {
    try {
      setJoiningId(matchId);
      await api.joinMatch(matchId);
      setDialog({
        visible: true,
        title: 'Đã tham gia kèo giao hữu',
        message: 'Thông tin ghép đội đã được ghi nhận trên hệ thống.',
      });
      await loadMatches(filter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập để tham gia kèo.';
      setDialog({ visible: true, title: 'Không thể tham gia', message: msg });
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreateQuickMatch = async () => {
    try {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await api.createMatchRequest({
        sportType: filter === 'ALL' ? 'FOOTBALL' : filter,
        matchDate: tomorrow,
        locationDescription: 'Cụm sân Phanta Sports',
        slotsNeeded: 1,
      });
      setDialog({
        visible: true,
        title: 'Đã tạo bài đăng cáp kèo',
        message: 'Bài đăng tìm đối thủ của bạn đã được lưu lên hệ thống.',
      });
      await loadMatches(filter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập để tạo bài đăng cáp kèo.';
      setDialog({ visible: true, title: 'Không thể tạo kèo', message: msg });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Sàn cáp kèo giao hữu"
        onBack={onBack}
        rightElement={
          <Pressable onPress={handleCreateQuickMatch}>
            <Text style={[styles.createLink, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              + Tạo kèo
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={[styles.infoBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoTitleRow}>
            <Users size={16} strokeWidth={1.75} color={theme.accent} />
            <Text style={[styles.infoTitle, { color: theme.accent, fontFamily: fonts.headingBold }]}>
              Tìm đối thủ và ghép đội
            </Text>
          </View>
          <Text style={[styles.infoDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
            Bài đăng tự liên kết với lịch sân đã thanh toán, chia đôi tiền sân 50/50 qua Ví Phanta Pay và gửi thông báo khi có đội nhận.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: 'ALL' as const, label: 'Tất cả' },
            { key: 'FOOTBALL' as const, label: 'Bóng đá' },
            { key: 'BADMINTON' as const, label: 'Cầu lông' },
            { key: 'TENNIS' as const, label: 'Quần vợt' },
          ].map((t) => {
            const active = filter === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFilter(t.key)}
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
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
        ) : posts.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Chưa có bài đăng cáp kèo nào trong mục này.
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <View
              key={post._id}
              style={[styles.postCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.postHeader}>
                <View style={styles.captainRow}>
                  <Image
                    source={require('../../assets/logo.jpg')}
                    style={[styles.avatar, { borderColor: theme.accent }]}
                  />
                  <View>
                    <Text style={[styles.teamName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                      {post.creatorId?.fullName || 'Đội giao hữu'}
                    </Text>
                    <Text style={[styles.captainName, { color: theme.textPrimary, fontFamily: fonts.bodyMedium }]}>
                      {post.locationDescription || 'Phanta Sports'}
                    </Text>
                    <Text style={[styles.levelText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Trạng thái: {post.status || 'OPEN'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.courtBadge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.courtText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                    {post.sportType || 'THỂ THAO'}
                  </Text>
                </View>
              </View>

              <View style={[styles.metaGrid, { backgroundColor: theme.surfaceElevated }]}>
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: theme.textMuted, fontFamily: fonts.body }]}>
                    Ngày thi đấu
                  </Text>
                  <Text style={[styles.metaValue, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                    {post.matchDate ? new Date(post.matchDate).toLocaleDateString('vi-VN') : '--'}
                  </Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={[styles.metaLabel, { color: theme.textMuted, fontFamily: fonts.body }]}>
                    Số suất cần ghép
                  </Text>
                  <Text style={[styles.metaValue, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                    {post.slotsNeeded || 1} suất
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={joiningId === post._id}
                onPress={() => handleJoin(post._id)}
                style={({ pressed }) => [
                  styles.joinBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.joinText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                  Nhận kèo giao hữu
                </Text>
              </Pressable>
            </View>
          ))
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
  createLink: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  infoBanner: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 6 },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTitle: { fontSize: 14 },
  infoDesc: { fontSize: 12, lineHeight: 18 },
  filterRow: { gap: spacing.sm },
  filterChip: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center' },
  filterText: { fontSize: 12 },
  emptyBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  postCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  captainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5 },
  teamName: { fontSize: 15 },
  captainName: { fontSize: 12 },
  levelText: { fontSize: 11 },
  courtBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  courtText: { fontSize: 11 },
  metaGrid: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  metaCol: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 11 },
  metaValue: { fontSize: 12 },
  joinBtn: { minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  joinText: { fontSize: 13 },
});
