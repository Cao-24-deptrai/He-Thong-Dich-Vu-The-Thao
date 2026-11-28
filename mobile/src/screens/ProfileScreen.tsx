import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  Edit3,
  QrCode,
  Dumbbell,
  Wallet,
  Tag,
  UserCheck,
  Users,
  Star,
  MessageSquare,
  Bell,
  ListChecks,
  WifiOff,
  ChevronRight,
  Crown,
  type LucideIcon,
} from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { EditProfileModal, ProfileFormData } from '../components/EditProfileModal';
import { AppDialog } from '../components/AppDialog';
import type { ScreenId } from '../../App';

interface Props {
  onBack: () => void;
  onNavigate?: (screen: ScreenId) => void;
  onOpenWallet?: () => void;
  onOpenHistory?: () => void;
  onOpenVouchers?: () => void;
}

export const ProfileScreen: React.FC<Props> = ({
  onBack,
  onNavigate,
  onOpenWallet,
  onOpenHistory,
  onOpenVouchers,
}) => {
  const theme = useTheme();
  const { user, token, logout, setUser } = useAuthStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileFormData>({
    fullName: user?.fullName || 'Khách',
    phone: user?.phone || 'Chưa đăng nhập',
    email: user?.email || '',
    dob: '',
    gender: 'Nam',
    sports: ['Bóng đá'],
  });
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!token) return;
    api
      .getMyProfile()
      .then((res) => {
        setProfile((p) => ({
          ...p,
          fullName: res.fullName || p.fullName,
          phone: res.phone || p.phone,
          email: res.email || '',
          sports: res.favoriteSports || p.sports,
        }));
      })
      .catch(() => null);

    api
      .getUserTierInfo()
      .then(setTierInfo)
      .catch(() => null);
  }, [token]);

  const menuItems: {
    label: string;
    Icon: LucideIcon;
    onPress: () => void;
    accentColor?: string;
  }[] = [
    {
      label: 'Chỉnh sửa hồ sơ và thông tin',
      Icon: Edit3,
      onPress: () => setEditModalVisible(true),
    },
    {
      label: 'Đơn đặt sân và vé QR của tôi',
      Icon: QrCode,
      onPress: () => (onOpenHistory ? onOpenHistory() : onNavigate?.('TICKET')),
    },
    {
      label: 'Thẻ Gym và dữ liệu Face ID',
      Icon: Dumbbell,
      onPress: () => onNavigate?.('GYM_POOL'),
    },
    {
      label: 'Ví Phanta Pay và sổ cái',
      Icon: Wallet,
      onPress: () => (onOpenWallet ? onOpenWallet() : onNavigate?.('WALLET')),
    },
    {
      label: 'Kho Voucher và ưu đãi hội viên',
      Icon: Tag,
      onPress: () => (onOpenVouchers ? onOpenVouchers() : onNavigate?.('VOUCHERS')),
    },
    {
      label: 'Đội ngũ huấn luyện viên PT 1-1',
      Icon: UserCheck,
      onPress: () => onNavigate?.('COACHES'),
    },
    {
      label: 'Sàn cáp kèo giao hữu',
      Icon: Users,
      onPress: () => onNavigate?.('MATCHMAKING'),
    },
    {
      label: 'Đánh giá chất lượng dịch vụ',
      Icon: Star,
      accentColor: theme.warning,
      onPress: () => onNavigate?.('RATINGS'),
    },
    {
      label: 'Trung tâm hỗ trợ khách hàng 24/7',
      Icon: MessageSquare,
      onPress: () => onNavigate?.('CHAT'),
    },
    {
      label: 'Trung tâm thông báo (FCM và ZNS)',
      Icon: Bell,
      onPress: () => onNavigate?.('NOTIFICATIONS'),
    },
    {
      label: 'Quy trình 6 bước đặt sân',
      Icon: ListChecks,
      onPress: () => onNavigate?.('PROCESS'),
    },
    {
      label: 'Chế độ ngoại tuyến (Offline Pack)',
      Icon: WifiOff,
      accentColor: theme.warning,
      onPress: () => onNavigate?.('OFFLINE'),
    },
  ];

  const handleSaveProfile = async (updated: ProfileFormData) => {
    try {
      const res = await api.updateMyProfile({
        fullName: updated.fullName,
        email: updated.email || undefined,
        favoriteSports: updated.sports,
      });
      setProfile(updated);
      if (user && token) {
        setUser({ ...user, fullName: res.fullName, email: res.email }, token);
      }
      setEditModalVisible(false);
      setDialog({
        visible: true,
        title: 'Đã cập nhật hồ sơ',
        message: 'Thông tin cá nhân đã được lưu vào hệ thống.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập để cập nhật hồ sơ.';
      setDialog({ visible: true, title: 'Không thể cập nhật', message: msg });
    }
  };

  const handleAuthAction = async () => {
    if (token) {
      await logout();
      onNavigate?.('AUTH');
    } else {
      onNavigate?.('AUTH');
    }
  };

  const spend = tierInfo?.rolling12MonthSpend ?? 0;
  const nextSpend = tierInfo?.nextTier?.minSpend ?? 15000000;
  const progressPct = Math.min(100, Math.round((spend / nextSpend) * 100));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Tài khoản khách hàng" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
          <Image
            source={require('../../assets/logo.jpg')}
            style={[styles.avatar, { borderColor: theme.accent }]}
            resizeMode="cover"
          />
          <Text style={[styles.name, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            {profile.fullName}
          </Text>
          <Text style={[styles.phone, { color: theme.textPrimary, fontFamily: fonts.bodySemiBold }]}>
            {profile.phone}
          </Text>

          {token ? (
            <Pressable
              onPress={() => setEditModalVisible(true)}
              style={({ pressed }) => [
                styles.editBtn,
                {
                  backgroundColor: theme.accentSoft,
                  borderColor: theme.borderAccent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Edit3 size={14} strokeWidth={1.75} color={theme.accent} />
              <Text style={[styles.editBtnText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                Chỉnh sửa thông tin cá nhân
              </Text>
            </Pressable>
          ) : null}

          {tierInfo ? (
            <View style={[styles.tierBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <View style={styles.tierTop}>
                <View style={styles.tierLabelRow}>
                  <Crown size={14} strokeWidth={1.75} color={theme.warning} />
                  <Text style={[styles.tierTitle, { color: theme.warning, fontFamily: fonts.bodySemiBold }]}>
                    {tierInfo.tierName || `Hạng ${tierInfo.currentTier}`}
                  </Text>
                </View>
                <Text style={[styles.tierBenefit, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                  Giảm {tierInfo.discountRate || 0}%
                </Text>
              </View>
              <Text style={[styles.tierProgressText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Chi tiêu 12 tháng:{' '}
                <Text style={{ color: theme.textHeading, fontFamily: fonts.bodySemiBold }}>
                  {spend.toLocaleString('vi-VN')} đ
                </Text>{' '}
                / {nextSpend.toLocaleString('vi-VN')} đ
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: theme.warning }]} />
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {menuItems.map((item, idx) => {
            const IconComp = item.Icon;
            return (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.menuItem,
                  idx < menuItems.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.borderSubtle,
                  },
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={styles.menuLeft}>
                  <IconComp
                    size={17}
                    strokeWidth={1.75}
                    color={item.accentColor || theme.accent}
                  />
                  <Text style={[styles.menuLabel, { color: theme.textHeading, fontFamily: fonts.bodyMedium }]}>
                    {item.label}
                  </Text>
                </View>
                <ChevronRight size={16} strokeWidth={1.75} color={theme.textMuted} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleAuthAction}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: token ? theme.dangerSoft : theme.accent,
              borderColor: token ? theme.danger : theme.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.logoutText,
              {
                color: token ? theme.danger : theme.onAccent,
                fontFamily: fonts.bodySemiBold,
              },
            ]}
          >
            {token ? 'Đăng xuất tài khoản' : 'Đăng nhập tài khoản'}
          </Text>
        </Pressable>
      </ScrollView>

      <EditProfileModal
        visible={editModalVisible}
        initialData={profile}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveProfile}
      />

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
  profileCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  avatar: { width: 76, height: 76, borderRadius: 20, borderWidth: 2, marginBottom: spacing.xs },
  name: { fontSize: 18 },
  phone: { fontSize: 13 },
  editBtn: {
    marginTop: spacing.sm,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtnText: { fontSize: 12 },
  tierBox: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 6,
  },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierTitle: { fontSize: 12 },
  tierBenefit: { fontSize: 12 },
  tierProgressText: { fontSize: 11, lineHeight: 16 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  progressFill: { height: '100%', borderRadius: 3 },
  menuCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  menuLabel: { fontSize: 13 },
  logoutBtn: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 13 },
});
