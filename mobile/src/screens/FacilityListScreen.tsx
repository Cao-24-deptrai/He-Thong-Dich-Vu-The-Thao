import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  Search,
  Bell,
  ArrowRight,
  MapPin,
  Dumbbell,
  Waves,
  UserCheck,
} from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { Facility } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import type { ScreenId } from '../../App';

const SPORT_CATEGORIES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FOOTBALL', label: 'Bóng đá' },
  { key: 'TENNIS', label: 'Tennis' },
  { key: 'BADMINTON', label: 'Cầu lông' },
  { key: 'BASKETBALL', label: 'Bóng rổ' },
  { key: 'PICKLEBALL', label: 'Pickleball' },
  { key: 'VOLLEYBALL', label: 'Bóng chuyền' },
];

interface Props {
  onSelectFacility: (fac: Facility) => void;
  onNavigate?: (screen: ScreenId) => void;
}

export const FacilityListScreen: React.FC<Props> = ({
  onSelectFacility,
  onNavigate,
}) => {
  const theme = useTheme();
  const { user, token } = useAuthStore();
  const { setSelectedFacility } = useBookingStore();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFacilities = async (category: string) => {
    try {
      setLoading(true);
      const data = await api.getFacilities(
        category === 'ALL' ? undefined : category
      );
      setFacilities(data);
    } catch (err) {
      console.error('Failed to load facilities:', err);
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (!token) {
      setWalletBalance(null);
      setTierName(null);
      return;
    }
    api
      .getMyWallet()
      .then((w) => setWalletBalance(w.balance ?? 0))
      .catch(() => setWalletBalance(null));
    api
      .getUserTierInfo()
      .then((t) => setTierName(t.currentTier || null))
      .catch(() => setTierName(null));
  }, [token]);

  const filteredFacilities = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (fac: Facility) => {
    setSelectedFacility(fac);
    onSelectFacility(fac);
  };

  const displayName = user?.fullName || 'Khách';
  const walletLabel =
    walletBalance !== null
      ? `${walletBalance.toLocaleString('vi-VN')} đ`
      : token
        ? 'Ví Pay'
        : 'Đăng nhập';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View
          style={[
            styles.stickyHeader,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => onNavigate?.('PROFILE')}
              style={styles.userBlock}
            >
              <View
                style={[
                  styles.avatarBox,
                  {
                    borderColor: theme.accent,
                    backgroundColor: theme.surfaceElevated,
                  },
                ]}
              >
                <Image
                  source={require('../../assets/logo.jpg')}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.userName,
                      { color: theme.textHeading, fontFamily: fonts.headingBold },
                    ]}
                  >
                    {displayName}
                  </Text>
                  {tierName ? (
                    <View
                      style={[
                        styles.tierBadge,
                        {
                          backgroundColor: theme.warningSoft,
                          borderColor: theme.warning,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tierBadgeText,
                          { color: theme.warning, fontFamily: fonts.bodySemiBold },
                        ]}
                      >
                        {tierName}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.openHours,
                    { color: theme.accent, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Mở cửa: 06:00 - 23:00
                </Text>
              </View>
            </Pressable>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => onNavigate?.(token ? 'WALLET' : 'AUTH')}
                style={({ pressed }) => [
                  styles.walletChip,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.walletText,
                    { color: theme.accent, fontFamily: fonts.headingBold },
                  ]}
                >
                  {walletLabel}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onNavigate?.('NOTIFICATIONS')}
                accessibilityLabel="Thông báo"
                style={({ pressed }) => [
                  styles.bellBtn,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Bell size={18} strokeWidth={1.75} color={theme.textPrimary} />
              </Pressable>

              <ThemeToggleButton />
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Hero Banner */}
          <Pressable
            onPress={() => onNavigate?.('BOOKING_SLOTS')}
            style={({ pressed }) => [
              styles.heroCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=700&q=80',
              }}
              style={styles.heroImg}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay}>
              <View style={styles.heroTagRow}>
                <View
                  style={[
                    styles.heroOrangeTag,
                    { backgroundColor: theme.accentSecondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroOrangeTagText,
                      { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold },
                    ]}
                  >
                    Trận đấu hôm nay 17:30 - 21:00
                  </Text>
                </View>
                <View style={styles.heroHoldTag}>
                  <Text
                    style={[
                      styles.heroHoldTagText,
                      { fontFamily: fonts.bodySemiBold },
                    ]}
                  >
                    Giữ chỗ 10p
                  </Text>
                </View>
              </View>

              <Text style={[styles.heroTitle, { fontFamily: fonts.headingBold }]}>
                Giải bóng đá Phanta Champions Cup
              </Text>
              <Text style={[styles.heroDesc, { fontFamily: fonts.body }]}>
                Cụm 8 sân cỏ FIFA Pro F1-F8 có đèn LED ban đêm và khán đài 500 chỗ. Thanh toán VietQR tự động trong 3 giây.
              </Text>

              <View style={styles.heroFooter}>
                <View>
                  <Text style={[styles.priceLabel, { fontFamily: fonts.body }]}>
                    Giá từ
                  </Text>
                  <Text style={[styles.priceValue, { fontFamily: fonts.headingBold }]}>
                    250.000 đ / 60 phút
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroCta,
                    { backgroundColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroCtaText,
                      { color: theme.onAccent, fontFamily: fonts.bodySemiBold },
                    ]}
                  >
                    Đặt sân ngay
                  </Text>
                  <ArrowRight size={14} strokeWidth={2} color={theme.onAccent} />
                </View>
              </View>
            </View>
          </Pressable>

          {/* Search Input */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
              },
            ]}
          >
            <Search size={16} strokeWidth={1.75} color={theme.textMuted} />
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.textHeading, fontFamily: fonts.body },
              ]}
              placeholder="Tìm tên cơ sở hoặc địa chỉ"
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Sport Category Chips */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                Các cụm tiện ích thể thao
              </Text>
              <Text
                style={[
                  styles.sectionMeta,
                  { color: theme.accent, fontFamily: fonts.bodyMedium },
                ]}
              >
                7 cụm sân
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {SPORT_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={[
                      styles.sportChip,
                      {
                        backgroundColor: active
                          ? theme.accent
                          : theme.surfaceElevated,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        {
                          color: active ? theme.onAccent : theme.textPrimary,
                          fontFamily: active ? fonts.bodySemiBold : fonts.bodyMedium,
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Quick Showcase 2 Columns: Gym Face ID & 2 Pools */}
          <View style={styles.showcaseGrid}>
            <Pressable
              onPress={() => onNavigate?.('GYM_POOL')}
              style={({ pressed }) => [
                styles.showcaseCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.showcaseIconBox, { backgroundColor: theme.accentSoft }]}>
                <Dumbbell size={18} strokeWidth={1.75} color={theme.accent} />
              </View>
              <Text
                style={[
                  styles.showcaseTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                Tổ hợp Gym Fitness
              </Text>
              <Text
                style={[
                  styles.showcaseDesc,
                  { color: theme.textSecondary, fontFamily: fonts.body },
                ]}
              >
                Cửa xoay Face ID, vào tự do không giới hạn lượt
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onNavigate?.('GYM_POOL')}
              style={({ pressed }) => [
                styles.showcaseCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.showcaseIconBox, { backgroundColor: theme.infoSoft }]}>
                <Waves size={18} strokeWidth={1.75} color={theme.info} />
              </View>
              <Text
                style={[
                  styles.showcaseTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                2 Hồ bơi tiêu chuẩn
              </Text>
              <Text
                style={[
                  styles.showcaseDesc,
                  { color: theme.textSecondary, fontFamily: fonts.body },
                ]}
              >
                Olympic 50m 8 làn và bể nước ấm 25m Heat Pump
              </Text>
            </Pressable>
          </View>

          {/* PT Coach Teaser */}
          <View
            style={[
              styles.ptCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderLeftColor: theme.accentSecondary,
              },
            ]}
          >
            <View style={[styles.ptIconBox, { backgroundColor: theme.accentSecondarySoft }]}>
              <UserCheck size={20} strokeWidth={1.75} color={theme.accentSecondary} />
            </View>
            <View style={styles.ptInfo}>
              <Text
                style={[
                  styles.ptTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                Tập cùng HLV PT 1-1
              </Text>
              <Text
                style={[
                  styles.ptDesc,
                  { color: theme.textSecondary, fontFamily: fonts.body },
                ]}
              >
                Huấn luyện cá nhân Gym, Cầu lông và Tennis
              </Text>
            </View>
            <Pressable
              onPress={() => onNavigate?.('COACHES')}
              style={({ pressed }) => [
                styles.ptBtn,
                {
                  backgroundColor: theme.accentSecondary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.ptBtnText,
                  { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold },
                ]}
              >
                Đặt lịch
              </Text>
            </Pressable>
          </View>

          {/* 6-Step Process Teaser */}
          <View
            style={[
              styles.processCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                Quy trình 6 bước khách hàng
              </Text>
              <Pressable onPress={() => onNavigate?.('PROCESS')}>
                <Text
                  style={[
                    styles.linkText,
                    { color: theme.accent, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Xem chi tiết
                </Text>
              </Pressable>
            </View>
            <View style={styles.processGrid}>
              <Pressable
                onPress={() => onNavigate?.('BOOKING_SLOTS')}
                style={[
                  styles.processStep,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepLabel,
                    { color: theme.accent, fontFamily: fonts.headingBold },
                  ]}
                >
                  Bước 1-2
                </Text>
                <Text
                  style={[
                    styles.stepDesc,
                    { color: theme.textPrimary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Khóa slot 10p
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onNavigate?.('TICKET')}
                style={[
                  styles.processStep,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepLabel,
                    { color: theme.accent, fontFamily: fonts.headingBold },
                  ]}
                >
                  Bước 3-4
                </Text>
                <Text
                  style={[
                    styles.stepDesc,
                    { color: theme.textPrimary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Vé QR 60 giây
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onNavigate?.('GYM_POOL')}
                style={[
                  styles.processStep,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepLabel,
                    { color: theme.accent, fontFamily: fonts.headingBold },
                  ]}
                >
                  Bước 5-6
                </Text>
                <Text
                  style={[
                    styles.stepDesc,
                    { color: theme.textPrimary, fontFamily: fonts.bodyMedium },
                  ]}
                >
                  Face ID & Hoàn cọc
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Facilities List from API */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textHeading, fontFamily: fonts.headingBold },
                ]}
              >
                Danh sách cơ sở hoạt động
              </Text>
              <Text
                style={[
                  styles.sectionMeta,
                  { color: theme.textSecondary, fontFamily: fonts.body },
                ]}
              >
                {filteredFacilities.length} cơ sở
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.accent} />
                <Text
                  style={[
                    styles.loadingText,
                    { color: theme.textSecondary, fontFamily: fonts.body },
                  ]}
                >
                  Đang tải danh sách sân bãi
                </Text>
              </View>
            ) : filteredFacilities.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.textSecondary, fontFamily: fonts.body },
                  ]}
                >
                  Không tìm thấy cơ sở phù hợp với từ khóa hiện tại.
                </Text>
              </View>
            ) : (
              <View style={styles.facilitiesList}>
                {filteredFacilities.map((fac) => (
                  <Pressable
                    key={fac._id}
                    onPress={() => handleSelect(fac)}
                    style={({ pressed }) => [
                      styles.facilityCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={styles.facilityHeader}>
                      <Text
                        style={[
                          styles.facilityName,
                          { color: theme.textHeading, fontFamily: fonts.headingBold },
                        ]}
                      >
                        {fac.name}
                      </Text>
                      <ArrowRight size={16} strokeWidth={1.75} color={theme.accent} />
                    </View>
                    <View style={styles.addressRow}>
                      <MapPin size={13} strokeWidth={1.75} color={theme.textMuted} />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.facilityAddress,
                          { color: theme.textSecondary, fontFamily: fonts.body },
                        ]}
                      >
                        {fac.address}
                      </Text>
                    </View>
                    <View style={styles.facilityMeta}>
                      <Text
                        style={[
                          styles.facilityHours,
                          { color: theme.textMuted, fontFamily: fonts.body },
                        ]}
                      >
                        {fac.operatingHours?.openTime || '06:00'} -{' '}
                        {fac.operatingHours?.closeTime || '23:00'}
                      </Text>
                      <Text
                        style={[
                          styles.facilityAction,
                          { color: theme.accent, fontFamily: fonts.bodySemiBold },
                        ]}
                      >
                        Chọn khung giờ
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 10,
  },
  openHours: {
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  walletChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  walletText: {
    fontSize: 13,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    height: 220,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 11, 0.72)',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroOrangeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  heroOrangeTagText: {
    fontSize: 11,
  },
  heroHoldTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.4)',
  },
  heroHoldTagText: {
    fontSize: 11,
    color: '#9CFF93',
  },
  heroTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  heroDesc: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 17,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priceLabel: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  priceValue: {
    fontSize: 15,
    color: '#9CFF93',
  },
  heroCta: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCtaText: {
    fontSize: 12,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    minHeight: 44,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
  },
  sectionMeta: {
    fontSize: 12,
  },
  linkText: {
    fontSize: 12,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  sportChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  sportChipText: {
    fontSize: 12,
  },
  showcaseGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  showcaseCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  showcaseIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  showcaseTitle: {
    fontSize: 14,
  },
  showcaseDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  ptCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ptIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptInfo: {
    flex: 1,
    gap: 2,
  },
  ptTitle: {
    fontSize: 14,
  },
  ptDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  ptBtn: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptBtnText: {
    fontSize: 12,
  },
  processCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  processGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  processStep: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  stepLabel: {
    fontSize: 12,
  },
  stepDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  loadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyBox: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  facilitiesList: {
    gap: spacing.sm,
  },
  facilityCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  facilityName: {
    fontSize: 15,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facilityAddress: {
    fontSize: 12,
    flex: 1,
  },
  facilityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  facilityHours: {
    fontSize: 11,
  },
  facilityAction: {
    fontSize: 12,
  },
});
