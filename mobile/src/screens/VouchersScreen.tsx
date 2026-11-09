// mobile/src/screens/VouchersScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { Voucher, CustomerTierInfo } from '../types';
import { useBookingStore } from '../store/useBookingStore';

interface Props {
  onBack?: () => void;
  onSelectVoucher?: (voucher: Voucher) => void;
}

// Fallback tier data when backend is in guest mode
const DEFAULT_TIER_INFO: CustomerTierInfo = {
  currentTier: 'GOLD',
  tierName: 'Hội Viên Vàng (Gold VIP)',
  rolling12MonthSpend: 18500000,
  totalLifetimeSpend: 24200000,
  loyaltyPoints: 1250,
  discountRate: 5,
  pointMultiplier: 1.5,
  nextTier: {
    tier: 'PLATINUM',
    name: 'Hội Viên Kim Cương (Platinum)',
    minSpend: 30000000,
    remainingSpend: 11500000,
  },
  tierExpiresAt: '2027-10-31T00:00:00.000Z',
};

// Fallback voucher items to guarantee an engaging UX
const FALLBACK_VOUCHERS: Voucher[] = [
  {
    _id: 'v1',
    code: 'PHANTA50K',
    title: 'Giảm 50.000 đ Đặt Sân Đầu Tuần',
    description: 'Áp dụng cho mọi cụm sân thể thao với đơn từ 300.000 đ',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 300000,
    totalBudget: 50000000,
    usedBudget: 18500000,
    perUserLimit: 2,
    validUntil: '2026-12-31T23:59:59.000Z',
    isActive: true,
  },
  {
    _id: 'v2',
    code: 'GOLDVIP15',
    title: 'Đặc Quyền Giảm 15% Hội Viên Vàng & Platinum',
    description: 'Chiết khấu độc quyền tối đa 80.000 đ trên mọi loại sân',
    discountType: 'PERCENT',
    discountValue: 15,
    maxDiscountAmount: 80000,
    minOrderValue: 200000,
    applicableCustomerTiers: ['GOLD', 'PLATINUM'],
    totalBudget: 30000000,
    usedBudget: 9400000,
    perUserLimit: 3,
    validUntil: '2026-11-30T23:59:59.000Z',
    isActive: true,
  },
  {
    _id: 'v3',
    code: 'WEEKEND10',
    title: 'Ưu Đãi Trận Đấu Cuối Tuần 10%',
    description: 'Giảm 10% tối đa 50.000 đ cho các trận Bóng đá và Tennis Thứ 7 & CN',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscountAmount: 50000,
    minOrderValue: 250000,
    applicableSports: ['Bóng đá', 'Tennis'],
    totalBudget: 20000000,
    usedBudget: 14600000,
    perUserLimit: 1,
    validUntil: '2026-11-15T23:59:59.000Z',
    isActive: true,
  },
  {
    _id: 'v4',
    code: 'WELCOME100K',
    title: 'Chào Mừng Thành Viên Mới 100K',
    description: 'Giảm ngay 100.000 đ cho đơn đặt sân đầu tiên từ 400.000 đ',
    discountType: 'FIXED',
    discountValue: 100000,
    minOrderValue: 400000,
    totalBudget: 100000000,
    usedBudget: 42000000,
    perUserLimit: 1,
    validUntil: '2026-12-31T23:59:59.000Z',
    isActive: true,
  },
];

export const VouchersScreen: React.FC<Props> = ({ onBack, onSelectVoucher }) => {
  const { appliedVoucher, setAppliedVoucher, activeBooking } = useBookingStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>(FALLBACK_VOUCHERS);
  const [tierInfo, setTierInfo] = useState<CustomerTierInfo>(DEFAULT_TIER_INFO);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'ELIGIBLE' | 'APPLIED'>('ALL');
  const [inputCode, setInputCode] = useState('');
  const [validating, setValidating] = useState(false);

  // Load backend vouchers & tier info
  const loadData = async () => {
    try {
      const [fetchedVouchers, fetchedTier] = await Promise.allSettled([
        api.getVouchers(true),
        api.getUserTierInfo(),
      ]);

      if (fetchedVouchers.status === 'fulfilled' && Array.isArray(fetchedVouchers.value) && fetchedVouchers.value.length > 0) {
        setVouchers(fetchedVouchers.value);
      }
      if (fetchedTier.status === 'fulfilled' && fetchedTier.value) {
        setTierInfo(fetchedTier.value);
      }
    } catch (err) {
      console.warn('Using fallback vouchers data due to network error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Check custom promo code input
  const handleCheckCode = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Nhắc nhở', 'Vui lòng nhập mã khuyến mãi');
      return;
    }

    setValidating(true);
    try {
      // Validate with current active booking or standard reference order amount 300,000đ
      const testAmount = activeBooking?.totalPrice || 300000;
      const res = await api.validateVoucher(trimmed, testAmount);

      if (res.valid && res.voucher) {
        const matching = vouchers.find((v) => v.code === trimmed);
        const voucherToApply = matching || res.voucher;

        setAppliedVoucher(voucherToApply, res.discountAmount);
        if (!matching) {
          setVouchers((prev) => [voucherToApply, ...prev]);
        }

        Alert.alert(
          'Mã hợp lệ!',
          `Mã ${trimmed} được áp dụng thành công!\nMức chiết khấu: -${res.discountAmount.toLocaleString('vi-VN')} đ`
        );
        setInputCode('');
        if (onSelectVoucher) {
          onSelectVoucher(voucherToApply);
        }
      } else {
        Alert.alert('Không thể áp dụng', res.reason || 'Mã voucher không hợp lệ hoặc đã hết lượt.');
      }
    } catch (err: any) {
      // Check locally in existing list if API throws
      const localMatch = vouchers.find((v) => v.code.toUpperCase() === trimmed);
      if (localMatch) {
        setAppliedVoucher(localMatch, localMatch.discountType === 'FIXED' ? localMatch.discountValue : 30000);
        Alert.alert('Thành công', `Đã chọn mã ${localMatch.code}`);
        setInputCode('');
      } else {
        Alert.alert('Lỗi kiểm tra', err.message || 'Mã voucher không tồn tại');
      }
    } finally {
      setValidating(false);
    }
  };

  // Toggle apply / remove voucher
  const handleToggleVoucher = async (v: Voucher) => {
    const isCurrentlyApplied = appliedVoucher?.code === v.code;

    if (isCurrentlyApplied) {
      setAppliedVoucher(null, 0);
      Alert.alert('Đã gỡ mã', `Đã hủy áp dụng mã ${v.code}`);
      return;
    }

    try {
      const orderAmount = activeBooking?.totalPrice || 300000;
      const res = await api.validateVoucher(v.code, orderAmount);

      if (res.valid) {
        setAppliedVoucher(v, res.discountAmount);
        Alert.alert(
          'Áp dụng thành công!',
          `Mã ${v.code} sẽ giảm ngay -${res.discountAmount.toLocaleString('vi-VN')} đ cho đơn đặt sân của bạn!`
        );
        if (onSelectVoucher) {
          onSelectVoucher(v);
        }
      } else {
        Alert.alert('Không đủ điều kiện', res.reason || 'Vui lòng kiểm tra lại điều kiện áp dụng mã.');
      }
    } catch (err: any) {
      // Offline fallback: calculate discount locally
      let discount = 0;
      const orderAmount = activeBooking?.totalPrice || 300000;
      if (v.discountType === 'FIXED') {
        discount = v.discountValue;
      } else {
        discount = Math.min((orderAmount * v.discountValue) / 100, v.maxDiscountAmount || Infinity);
      }
      setAppliedVoucher(v, discount);
      Alert.alert('Đã lưu mã', `Áp dụng voucher ${v.code}: giảm ước tính -${discount.toLocaleString('vi-VN')} đ`);
      if (onSelectVoucher) {
        onSelectVoucher(v);
      }
    }
  };

  // Filter vouchers according to selected tab
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (selectedTab === 'APPLIED') {
        return appliedVoucher?.code === v.code;
      }
      if (selectedTab === 'ELIGIBLE') {
        if (!v.applicableCustomerTiers || v.applicableCustomerTiers.length === 0) return true;
        return v.applicableCustomerTiers.includes(tierInfo.currentTier);
      }
      return true;
    });
  }, [vouchers, selectedTab, appliedVoucher, tierInfo]);

  // Tier theme colors & labels
  const tierColor = {
    MEMBER: '#10b981',
    SILVER: '#94a3b8',
    GOLD: '#f59e0b',
    PLATINUM: '#38bdf8',
  }[tierInfo.currentTier] || colors.primary;

  const tierPercentProgress = useMemo(() => {
    if (!tierInfo.nextTier) return 100;
    const current = tierInfo.rolling12MonthSpend;
    const target = tierInfo.nextTier.minSpend;
    return Math.min(100, Math.round((current / target) * 100));
  }, [tierInfo]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Voucher & Thẻ Thành Viên</Text>
            <Text style={styles.headerSubtitle}>Quản lý ưu đãi & quyền lợi tích lũy</Text>
          </View>
          <View style={[styles.activeBadge, { borderColor: tierColor }]}>
            <Text style={[styles.activeBadgeText, { color: tierColor }]}>{tierInfo.currentTier}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Customer Tier Membership VIP Card (BR-16, BR-17) */}
          <View style={[styles.tierCard, { borderColor: tierColor }]}>
            <View style={styles.tierCardHeader}>
              <View>
                <Text style={styles.tierSubLabel}>HẠNG THÀNH VIÊN HIỆN TẠI</Text>
                <Text style={[styles.tierTitle, { color: tierColor }]}>{tierInfo.tierName}</Text>
              </View>
              <View style={[styles.tierIconBadge, { backgroundColor: tierColor + '20' }]}>
                <Text style={{ fontSize: 24 }}>
                  {tierInfo.currentTier === 'PLATINUM' ? '[KIM CƯƠNG]' : tierInfo.currentTier === 'GOLD' ? '[VÀNG]' : '[BẠC]'}
                </Text>
              </View>
            </View>

            <View style={styles.tierStatsGrid}>
              <View style={styles.tierStatItem}>
                <Text style={styles.tierStatLabel}>Chi tiêu 12 tháng trượt</Text>
                <Text style={styles.tierStatVal}>
                  {tierInfo.rolling12MonthSpend.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.tierStatSub}>Theo quy định BR-16</Text>
              </View>
              <View style={styles.tierStatItem}>
                <Text style={styles.tierStatLabel}>Điểm tích lũy</Text>
                <Text style={[styles.tierStatVal, { color: colors.primary }]}>
                  {tierInfo.loyaltyPoints.toLocaleString('vi-VN')} pts
                </Text>
                <Text style={styles.tierStatSub}>
                  = {(tierInfo.loyaltyPoints * 100).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {/* Privileges Row */}
            <View style={styles.tierBenefitsRow}>
              <View style={styles.benefitTag}>
                <Text style={styles.benefitTagText}>Giảm {tierInfo.discountRate}% mọi đơn sân</Text>
              </View>
              <View style={styles.benefitTag}>
                <Text style={styles.benefitTagText}>Nhân {tierInfo.pointMultiplier}x điểm thưởng</Text>
              </View>
            </View>

            {/* Progress to Next Tier */}
            {tierInfo.nextTier ? (
              <View style={styles.nextTierBox}>
                <View style={styles.nextTierTextRow}>
                  <Text style={styles.nextTierLabel}>Tiến trình lên {tierInfo.nextTier.name}</Text>
                  <Text style={styles.nextTierPercent}>{tierPercentProgress}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${tierPercentProgress}%`, backgroundColor: tierColor }]} />
                </View>
                <Text style={styles.nextTierRemaining}>
                  Cần thêm {tierInfo.nextTier.remainingSpend.toLocaleString('vi-VN')} đ trong 12 tháng để thăng hạng
                </Text>
              </View>
            ) : (
              <View style={styles.maxTierBox}>
                <Text style={styles.maxTierText}>Bạn đang sở hữu hạng thành viên cao nhất của Phanta!</Text>
              </View>
            )}
          </View>

          {/* Quick Promo Input Box */}
          <View style={styles.promoInputBox}>
            <TextInput
              style={styles.promoInput}
              placeholder="Nhập mã voucher (VD: PHANTA50K)"
              placeholderTextColor={colors.textMuted}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.promoBtn, validating && { opacity: 0.6 }]}
              disabled={validating}
              onPress={handleCheckCode}
            >
              {validating ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.promoBtnText}>Áp Dụng</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Filter Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, selectedTab === 'ALL' && styles.tabItemActive]}
              onPress={() => setSelectedTab('ALL')}
            >
              <Text style={[styles.tabText, selectedTab === 'ALL' && styles.tabTextActive]}>
                Tất Cả ({vouchers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, selectedTab === 'ELIGIBLE' && styles.tabItemActive]}
              onPress={() => setSelectedTab('ELIGIBLE')}
            >
              <Text style={[styles.tabText, selectedTab === 'ELIGIBLE' && styles.tabTextActive]}>
                Phù Hợp Cho Bạn
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, selectedTab === 'APPLIED' && styles.tabItemActive]}
              onPress={() => setSelectedTab('APPLIED')}
            >
              <Text style={[styles.tabText, selectedTab === 'APPLIED' && styles.tabTextActive]}>
                Đang Áp Dụng {appliedVoucher ? '(1)' : '(0)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vouchers List */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Đang tải kho ưu đãi...</Text>
            </View>
          ) : filteredVouchers.length === 0 ? (
            <View style={styles.emptyBox}>
              
              <Text style={styles.emptyTitle}>Không có voucher nào</Text>
              <Text style={styles.emptySub}>
                {selectedTab === 'APPLIED'
                  ? 'Bạn chưa chọn mã giảm giá nào. Hãy chọn một mã bên dưới để áp dụng!'
                  : 'Hãy kiểm tra lại điều kiện hoặc quay lại sau để nhận thêm ưu đãi mới.'}
              </Text>
            </View>
          ) : (
            <View style={styles.voucherList}>
              {filteredVouchers.map((v) => {
                const isApplied = appliedVoucher?.code === v.code;
                const budgetPercent =
                  v.totalBudget && v.totalBudget > 0
                    ? Math.min(100, Math.round(((v.usedBudget || 0) / v.totalBudget) * 100))
                    : 0;
                const isOutOfBudget = v.totalBudget ? (v.usedBudget || 0) >= v.totalBudget : false;

                return (
                  <View key={v._id || v.code} style={[styles.voucherCard, isApplied && styles.voucherCardApplied]}>
                    {/* Top Row: Code & Expiry */}
                    <View style={styles.voucherHeader}>
                      <View style={styles.voucherCodeBadge}>
                        <Text style={styles.voucherCodeText}>{v.code}</Text>
                      </View>
                      <Text style={styles.voucherExpiryText}>
                        HSD: {new Date(v.validUntil).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>

                    {/* Middle: Title & Discount info */}
                    <Text style={styles.voucherTitle}>{v.title || `Voucher ${v.code}`}</Text>
                    <Text style={styles.voucherDesc}>
                      {v.description ||
                        (v.discountType === 'FIXED'
                          ? `Giảm ${v.discountValue.toLocaleString('vi-VN')} đ`
                          : `Giảm ${v.discountValue}% (Tối đa ${(v.maxDiscountAmount || 0).toLocaleString('vi-VN')} đ)`)}
                    </Text>

                    {/* Rules & Conditions */}
                    <View style={styles.voucherConditionsRow}>
                      <Text style={styles.conditionItem}>
                        • Đơn tối thiểu: {(v.minOrderValue || 0).toLocaleString('vi-VN')} đ
                      </Text>
                      {v.perUserLimit && (
                        <Text style={styles.conditionItem}>• Tối đa {v.perUserLimit} lượt/khách</Text>
                      )}
                    </View>

                    {/* Tier Badges (if restricted) */}
                    {v.applicableCustomerTiers && v.applicableCustomerTiers.length > 0 && (
                      <View style={styles.applicableTiersRow}>
                        <Text style={styles.tiersLabel}>Dành riêng:</Text>
                        {v.applicableCustomerTiers.map((t) => (
                          <View key={t} style={styles.tierMiniBadge}>
                            <Text style={styles.tierMiniBadgeText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Budget Progress (BR-13) */}
                    {v.totalBudget && v.totalBudget > 0 && (
                      <View style={styles.budgetRow}>
                        <View style={styles.budgetLabels}>
                          <Text style={styles.budgetProgressText}>
                            Ngân sách đã dùng: {budgetPercent}%
                          </Text>
                          {isOutOfBudget && (
                            <Text style={styles.budgetWarning}>Hết ngân sách</Text>
                          )}
                        </View>
                        <View style={styles.budgetBarTrack}>
                          <View
                            style={[
                              styles.budgetBarFill,
                              {
                                width: `${budgetPercent}%`,
                                backgroundColor: isOutOfBudget ? colors.danger : colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}

                    {/* Card Actions Footer */}
                    <View style={styles.voucherFooter}>
                      <View>
                        <Text style={styles.discountHighlight}>
                          {v.discountType === 'FIXED'
                            ? `-${v.discountValue.toLocaleString('vi-VN')} đ`
                            : `-${v.discountValue}%`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          isApplied ? styles.actionBtnActive : styles.actionBtnNormal,
                          isOutOfBudget && styles.actionBtnDisabled,
                        ]}
                        disabled={isOutOfBudget}
                        onPress={() => handleToggleVoucher(v)}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,
                            isApplied && styles.actionBtnTextActive,
                            isOutOfBudget && { color: colors.textMuted },
                          ]}
                        >
                          {isOutOfBudget ? 'Hết Ngân Sách' : isApplied ? '[Đang Áp Dụng]' : 'Dùng Voucher'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 8, backgroundColor: colors.surface, borderRadius: 10, marginRight: 12 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerTitleBox: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  activeBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  activeBadgeText: { fontSize: 11, fontWeight: 'bold' },

  scrollContent: { paddingBottom: 40 },

  // Tier Card
  tierCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  tierCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierSubLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  tierTitle: { fontSize: 17, fontWeight: '900', marginTop: 2 },
  tierIconBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  tierStatsGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  tierStatItem: { flex: 1 },
  tierStatLabel: { fontSize: 11, color: colors.textSecondary },
  tierStatVal: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  tierStatSub: { fontSize: 9, color: colors.textMuted, marginTop: 1 },

  tierBenefitsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  benefitTag: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  benefitTagText: { fontSize: 11, color: '#e2e8f0', fontWeight: '600' },

  nextTierBox: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  nextTierTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nextTierLabel: { fontSize: 11, color: colors.textSecondary },
  nextTierPercent: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  progressBarTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  nextTierRemaining: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
  maxTierBox: { marginTop: 12, paddingVertical: 6 },
  maxTierText: { fontSize: 11, color: colors.volt, fontWeight: 'bold' },

  // Promo Input
  promoInputBox: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  promoInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  promoBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

  // Tabs
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItemActive: { backgroundColor: colors.surfaceLight, borderColor: colors.primary },
  tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: 'bold' },

  // List & Cards
  voucherList: { gap: 12 },
  voucherCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  voucherCardApplied: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  voucherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  voucherCodeBadge: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  voucherCodeText: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  voucherExpiryText: { fontSize: 11, color: colors.textMuted },
  voucherTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  voucherDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 16 },

  voucherConditionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  conditionItem: { fontSize: 11, color: colors.textMuted },

  applicableTiersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tiersLabel: { fontSize: 11, color: colors.textMuted },
  tierMiniBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierMiniBadgeText: { fontSize: 10, color: '#f59e0b', fontWeight: 'bold' },

  budgetRow: { marginBottom: 12 },
  budgetLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  budgetProgressText: { fontSize: 10, color: colors.textMuted },
  budgetWarning: { fontSize: 10, color: colors.danger, fontWeight: 'bold' },
  budgetBarTrack: { height: 4, backgroundColor: '#1e293b', borderRadius: 2, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 2 },

  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  discountHighlight: { fontSize: 16, fontWeight: '900', color: colors.volt },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  actionBtnNormal: { backgroundColor: '#1e293b' },
  actionBtnActive: { backgroundColor: colors.primary },
  actionBtnDisabled: { backgroundColor: '#1e293b', opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  actionBtnTextActive: { color: '#000', fontWeight: '900' },

  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  emptySub: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 16 },
});
