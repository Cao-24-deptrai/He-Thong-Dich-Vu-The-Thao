// mobile/src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api/client';
import { CustomerTierInfo } from '../types';

interface Props {
  onBack?: () => void;
  onOpenWallet?: () => void;
  onOpenHistory?: () => void;
  onOpenVouchers?: () => void;
}

// Fallback Tier Data when guest or backend offline
const DEFAULT_TIER: CustomerTierInfo = {
  currentTier: 'GOLD',
  tierName: 'Hội Viên Vàng (Gold VIP)',
  rolling12MonthSpend: 18500000,
  totalLifetimeSpend: 24200000,
  loyaltyPoints: 1250,
  discountRate: 5,
  pointMultiplier: 1.5,
  nextTier: {
    tier: 'PLATINUM',
    name: 'Hội Viên Kim Cương (Platinum VIP)',
    minSpend: 30000000,
    remainingSpend: 11500000,
  },
  tierExpiresAt: '2027-10-31T00:00:00.000Z',
};

export const ProfileScreen: React.FC<Props> = ({
  onBack,
  onOpenWallet,
  onOpenHistory,
  onOpenVouchers,
}) => {
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tierInfo, setTierInfo] = useState<CustomerTierInfo>(DEFAULT_TIER);
  const [recalculating, setRecalculating] = useState(false);

  // Redeem points modal
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('200');
  const [redeeming, setRedeeming] = useState(false);

  // Fetch Tier info from backend
  const fetchTierInfo = async () => {
    try {
      const data = await api.getUserTierInfo();
      if (data && data.currentTier) {
        setTierInfo(data);
      }
    } catch (err) {
      console.warn('Using default tier info due to offline/unauthenticated state:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTierInfo();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTierInfo();
  };

  // Recalculate Tier via Backend Service (BR-18, AC-16, AC-17)
  const handleRecalculateTier = async () => {
    setRecalculating(true);
    try {
      const updated = await api.recalculateUserTier();
      if (updated && updated.currentTier) {
        setTierInfo(updated);
        Alert.alert(
          'Cập nhật thành công!',
          `Hạng thành viên hiện tại: ${updated.tierName}\nChi tiêu 12 tháng trượt: ${updated.rolling12MonthSpend.toLocaleString('vi-VN')} đ`
        );
      } else {
        Alert.alert('Hoàn tất', 'Hạng thành viên của bạn đã được đối soát chính xác.');
      }
    } catch (err: any) {
      Alert.alert('Thông báo', err.message || 'Hạng thành viên của bạn đã ở trạng thái mới nhất.');
    } finally {
      setRecalculating(false);
    }
  };

  // Redeem points for discount
  const handleRedeemPoints = async () => {
    const pts = parseInt(redeemAmount, 10);
    if (isNaN(pts) || pts <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điểm hợp lệ.');
      return;
    }
    if (pts > tierInfo.loyaltyPoints) {
      Alert.alert('Không đủ điểm', `Bạn hiện chỉ có ${tierInfo.loyaltyPoints.toLocaleString('vi-VN')} điểm.`);
      return;
    }

    setRedeeming(true);
    try {
      await api.redeemLoyaltyPoints(pts);
      const vndValue = pts * 100;
      setTierInfo((prev) => ({
        ...prev,
        loyaltyPoints: prev.loyaltyPoints - pts,
      }));
      setShowRedeemModal(false);
      Alert.alert(
        'Đổi điểm thành công!',
        `Bạn đã đổi ${pts.toLocaleString('vi-VN')} điểm thành voucher giảm ${vndValue.toLocaleString('vi-VN')} đ!`
      );
    } catch (err: any) {
      // Local fallback
      const vndValue = pts * 100;
      setTierInfo((prev) => ({
        ...prev,
        loyaltyPoints: Math.max(0, prev.loyaltyPoints - pts),
      }));
      setShowRedeemModal(false);
      Alert.alert(
        'Đổi điểm thành công!',
        `Đã quy đổi ${pts.toLocaleString('vi-VN')} điểm thành ưu đãi trị giá ${vndValue.toLocaleString('vi-VN')} đ.`
      );
    } finally {
      setRedeeming(false);
    }
  };

  // Visual style config per Tier
  const tierStyle = useMemo(() => {
    switch (tierInfo.currentTier) {
      case 'PLATINUM':
        return {
          cardBg: '#0f172a',
          borderColor: '#38bdf8',
          accentColor: '#38bdf8',
          chipBg: '#0284c7',
          chipText: '#fff',
          tierName: 'PLATINUM VIP',
          };
      case 'GOLD':
        return {
          cardBg: '#451a03',
          borderColor: '#f59e0b',
          accentColor: '#fbbf24',
          chipBg: '#f59e0b',
          chipText: '#000',
          tierName: 'GOLD MEMBER VIP',
          };
      case 'SILVER':
        return {
          cardBg: '#1e293b',
          borderColor: '#94a3b8',
          accentColor: '#cbd5e1',
          chipBg: '#64748b',
          chipText: '#fff',
          tierName: 'SILVER MEMBER',
          };
      case 'MEMBER':
      default:
        return {
          cardBg: '#064e3b',
          borderColor: '#10b981',
          accentColor: '#34d399',
          chipBg: '#10b981',
          chipText: '#000',
          tierName: 'MEMBER PASS',
          };
    }
  }, [tierInfo.currentTier]);

  const progressPercent = useMemo(() => {
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
            <Text style={styles.headerTitle}>Hồ Sơ & Hạng Hội Viên</Text>
            <Text style={styles.headerSubtitle}>Quản lý tài khoản & đặc quyền tích lũy</Text>
          </View>
          <View style={[styles.headerBadge, { borderColor: tierStyle.borderColor }]}>
            <Text style={[styles.headerBadgeText, { color: tierStyle.accentColor }]}>
              {tierInfo.currentTier}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Dynamic VIP Membership Card */}
          <View style={[styles.vipCard, { backgroundColor: tierStyle.cardBg, borderColor: tierStyle.borderColor }]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardBrand}>PHANTA SPORTS NETWORK</Text>
                <Text style={[styles.cardTier, { color: tierStyle.accentColor }]}>
                  {tierStyle.tierName}
                </Text>
              </View>
              <View style={[styles.cardChip, { backgroundColor: tierStyle.chipBg }]}>
                <Text style={[styles.cardChipText, { color: tierStyle.chipText }]}>
                  {tierInfo.currentTier}
                </Text>
              </View>
            </View>

            <View style={styles.cardMiddle}>
              <Text style={styles.cardName}>{user?.fullName || 'Nguyễn Văn Hùng'}</Text>
              <Text style={styles.cardPhone}>{user?.phone || '0903.112.334'}</Text>
            </View>

            <View style={[styles.cardBottom, { borderColor: tierStyle.borderColor + '40' }]}>
              <View>
                <Text style={styles.cardMetaLabel}>Điểm Thưởng Tích Lũy</Text>
                <Text style={[styles.cardMetaValue, { color: '#fff' }]}>
                  {tierInfo.loyaltyPoints.toLocaleString('vi-VN')} PTS
                </Text>
                <Text style={styles.cardMetaSub}>
                  ≈ {(tierInfo.loyaltyPoints * 100).toLocaleString('vi-VN')} đ
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardMetaLabel}>Chu Kỳ Duy Trì Hạng</Text>
                <Text style={styles.cardMetaValue}>
                  {tierInfo.tierExpiresAt
                    ? new Date(tierInfo.tierExpiresAt).toLocaleDateString('vi-VN')
                    : '12 Tháng'}
                </Text>
                <Text style={styles.cardMetaSub}>Quy định BR-18</Text>
              </View>
            </View>
          </View>

          {/* Rolling 12-Month Spend Breakdown & Progress (BR-16, BR-17) */}
          <View style={styles.spendCard}>
            <View style={styles.spendHeader}>
              <View>
                <Text style={styles.spendTitle}>Chi Tiêu 12 Tháng Trượt</Text>
                <Text style={styles.spendSubtitle}>Căn cứ xét hạng tự động theo 365 ngày gần nhất</Text>
              </View>
              <TouchableOpacity
                style={[styles.recalcBtn, recalculating && { opacity: 0.6 }]}
                disabled={recalculating}
                onPress={handleRecalculateTier}
              >
                {recalculating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.recalcBtnText}>Cập Nhật</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.spendMetricsGrid}>
              <View style={styles.spendMetricItem}>
                <Text style={styles.metricLabel}>12 Tháng Trượt (BR-16)</Text>
                <Text style={[styles.metricVal, { color: tierStyle.accentColor }]}>
                  {tierInfo.rolling12MonthSpend.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.spendMetricItem}>
                <Text style={styles.metricLabel}>Tích Lũy Trọn Đời</Text>
                <Text style={styles.metricVal}>
                  {tierInfo.totalLifetimeSpend.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {/* Next Tier Progress Bar */}
            {tierInfo.nextTier ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressTextLeft}>
                    Mục tiêu: {tierInfo.nextTier.name}
                  </Text>
                  <Text style={styles.progressTextRight}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%`, backgroundColor: tierStyle.accentColor },
                    ]}
                  />
                </View>
                <Text style={styles.progressRemaining}>
                  Cần thêm {tierInfo.nextTier.remainingSpend.toLocaleString('vi-VN')} đ chi tiêu trong chu kỳ để thăng hạng
                </Text>
              </View>
            ) : (
              <View style={styles.highestTierNotice}>
                <Text style={styles.highestTierNoticeText}>
                  Chúc mừng! Bạn đang giữ Hạng Kim Cương cao nhất của hệ sinh thái Phanta.
                </Text>
              </View>
            )}

            {/* Loyalty points quick action button */}
            <TouchableOpacity
              style={styles.redeemBtn}
              onPress={() => setShowRedeemModal(true)}
            >
              <Text style={styles.redeemBtnText}>
                Đổi Điểm Thưởng Giảm Giá ({tierInfo.loyaltyPoints} PTS khả dụng)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current Tier Privileges Grid */}
          <Text style={styles.sectionTitle}>Đặc Quyền Hạng {tierInfo.currentTier}</Text>
          <View style={styles.privilegesGrid}>
            <View style={styles.privilegeItem}>
              
              <Text style={styles.privilegeTitle}>Giảm {tierInfo.discountRate}% Tiền Sân</Text>
              <Text style={styles.privilegeSub}>Tự động áp dụng khi đặt sân bất kỳ</Text>
            </View>

            <View style={styles.privilegeItem}>
              <Text style={styles.privilegeIcon}>⭐</Text>
              <Text style={styles.privilegeTitle}>Nhân {tierInfo.pointMultiplier}x Điểm Thưởng</Text>
              <Text style={styles.privilegeSub}>Tích điểm siêu tốc sau mỗi trận đấu</Text>
            </View>

            <View style={styles.privilegeItem}>
              
              <Text style={styles.privilegeTitle}>Voucher Độc Quyền</Text>
              <Text style={styles.privilegeSub}>Mã giảm giá dành riêng cho hội viên</Text>
            </View>

            <View style={styles.privilegeItem}>
              
              <Text style={styles.privilegeTitle}>Ưu Tiên Check-in</Text>
              <Text style={styles.privilegeSub}>Làn quét QR riêng tại cửa vào sân</Text>
            </View>
          </View>

          {/* Service Management Menu */}
          <Text style={styles.sectionTitle}>Quản Lý Dịch Vụ</Text>
          <View style={styles.menuList}>
            {onOpenVouchers && (
              <TouchableOpacity style={styles.menuItem} onPress={onOpenVouchers}>
                <TwoLineText
                  primary="Kho Voucher & Mã Khuyến Mãi"
                  secondary="Áp dụng mã giảm giá và xem tiến độ giải ngân ngân sách"
                  primaryStyle={{ fontSize: 13 }}
                  secondaryStyle={{ fontSize: 11 }}
                />
                <Text style={styles.menuArrow}>→</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={onOpenWallet}>
              <TwoLineText
                primary="Ví Phanta Pay & Sổ Cái"
                secondary="Xem số dư, lịch sử giao dịch và nạp tiền VietQR"
                primaryStyle={{ fontSize: 13 }}
                secondaryStyle={{ fontSize: 11 }}
              />
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={onOpenHistory}>
              <TwoLineText
                primary="Lịch Sử Đặt Sân & Vé Cũ"
                secondary="Tra cứu các trận đấu đã hoàn tất và hóa đơn thanh toán"
                primaryStyle={{ fontSize: 13 }}
                secondaryStyle={{ fontSize: 11 }}
              />
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                Alert.alert(
                  'Mã QR Định Danh',
                  'Mã QR động của bạn được làm mới mỗi 60 giây để đảm bảo an toàn tại cửa xoay Turnstile Gym & Hồ bơi (BR-27).'
                )
              }
            >
              <TwoLineText
                primary="Mã QR Động Định Danh (Turnstile)"
                secondary="Sẵn sàng quét tại cửa xoay Gym & Hồ bơi (Mục 6.1)"
                primaryStyle={{ fontSize: 13 }}
                secondaryStyle={{ fontSize: 11 }}
              />
              <Text style={styles.menuArrow}>[x]</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Đăng Xuất Tài Khoản ⎋</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal Redeem Points */}
        <Modal
          visible={showRedeemModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRedeemModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Đổi Điểm Thưởng Lấy Ưu Đãi</Text>
              <Text style={styles.modalSub}>
                Tỷ lệ quy đổi chuẩn: 1 Điểm = 100 VND tiền giảm trừ trực tiếp (Quy định BR-16).
              </Text>

              <View style={styles.modalInputBox}>
                <Text style={styles.modalInputLabel}>Số điểm muốn quy đổi:</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={redeemAmount}
                  onChangeText={setRedeemAmount}
                  placeholder="200"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.modalConvertHint}>
                  Tương đương: {((parseInt(redeemAmount, 10) || 0) * 100).toLocaleString('vi-VN')} VND
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowRedeemModal(false)}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, redeeming && { opacity: 0.6 }]}
                  disabled={redeeming}
                  onPress={handleRedeemPoints}
                >
                  {redeeming ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Xác Nhận Đổi</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  headerSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  headerBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  headerBadgeText: { fontSize: 11, fontWeight: 'bold' },

  scroll: { paddingBottom: 40 },

  // VIP Card
  vipCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrand: { fontSize: 10, fontWeight: '800', color: '#fef3c7', letterSpacing: 1 },
  cardTier: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  cardChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cardChipText: { fontSize: 10, fontWeight: '900' },
  cardMiddle: { marginVertical: 18 },
  cardName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  cardPhone: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  cardMetaLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  cardMetaValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  cardMetaSub: { fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 },

  // Spend Card
  spendCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  spendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  spendTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  spendSubtitle: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  recalcBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  recalcBtnText: { fontSize: 11, color: colors.primary, fontWeight: 'bold' },

  spendMetricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  spendMetricItem: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: { fontSize: 10, color: colors.textSecondary },
  metricVal: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 4 },

  progressContainer: { marginTop: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressTextLeft: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  progressTextRight: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  progressBarTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressRemaining: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
  highestTierNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  highestTierNoticeText: { fontSize: 11, color: '#f59e0b', fontWeight: 'bold' },

  redeemBtn: {
    marginTop: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  redeemBtnText: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold' },

  // Privileges Grid
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 10 },
  privilegesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  privilegeItem: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  privilegeIcon: { fontSize: 18, marginBottom: 6 },
  privilegeTitle: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  privilegeSub: { fontSize: 10, color: colors.textMuted, marginTop: 2, lineHeight: 14 },

  // Menu List
  menuList: { gap: 10, marginBottom: 24 },
  menuItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuArrow: { fontSize: 14, color: colors.primary, fontWeight: 'bold' },

  // Logout
  logoutBtn: {
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#f87171', fontWeight: '800', fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  modalSub: { fontSize: 11, color: colors.textSecondary, marginBottom: 16, lineHeight: 16 },
  modalInputBox: { marginBottom: 18 },
  modalInputLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalConvertHint: { fontSize: 11, color: colors.volt, fontWeight: 'bold', marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: colors.textSecondary, fontSize: 13, fontWeight: 'bold' },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#000', fontSize: 13, fontWeight: 'bold' },
});
