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
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
  onBook?: () => void;
}

export const GymMembershipScreen: React.FC<Props> = ({ onBack, onBook }) => {
  const theme = useTheme();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [gymQr, setGymQr] = useState<any>(null);
  const [gymPlans, setGymPlans] = useState<any[]>([]);
  const [gymCapacity, setGymCapacity] = useState<any>(null);
  const [poolStatus, setPoolStatus] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, capRes, poolRes] = await Promise.allSettled([
        api.getGymPlans(),
        api.getGymCapacity(),
        api.getPoolStatus(),
      ]);
      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value)) {
        setGymPlans(plansRes.value);
      }
      if (capRes.status === 'fulfilled') {
        setGymCapacity(capRes.value);
      }
      if (poolRes.status === 'fulfilled') {
        setPoolStatus(poolRes.value);
      }
      if (token) {
        const qrRes = await api.getMyGymQr().catch(() => null);
        setGymQr(qrRes);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleBuyGymPlan = async (planType: 'DAY_1' | 'MONTH_1' | 'MONTH_3' | 'MONTH_6') => {
    try {
      setPurchasing(true);
      await api.purchaseOrRenewGymPlan({ planType, paymentMethod: 'WALLET' });
      setDialog({
        visible: true,
        title: 'Đăng ký gói tập thành công',
        message: 'Thẻ thành viên Gym của bạn đã được kích hoạt từ hệ thống.',
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập hoặc kiểm tra số dư ví.';
      setDialog({ visible: true, title: 'Không thể đăng ký gói tập', message: msg });
    } finally {
      setPurchasing(false);
    }
  };

  const handleBuyPoolTicket = async () => {
    try {
      setPurchasing(true);
      const res = await api.purchasePoolTickets({
        adultCount: 1,
        childCount: 0,
        customerPhone: user?.phone,
        customerName: user?.fullName,
      });
      setDialog({
        visible: true,
        title: 'Mua vé hồ bơi thành công',
        message: res.message || `Đã xuất vé hồ bơi (${res.totalAmount?.toLocaleString('vi-VN')} đ).`,
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể mua vé hồ bơi lúc này.';
      setDialog({ visible: true, title: 'Lỗi mua vé hồ bơi', message: msg });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Tổ hợp Gym, Bơi và Bóng rổ"
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Quy định Gym và Bơi',
                message:
                  'Gym Face ID vào tự do không giới hạn lượt. Hồ bơi gồm bể Olympic 50m chuẩn FINA và bể nước ấm 25m duy trì 31.5 độ C.',
              })
            }
          >
            <Text style={[styles.ruleText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              Quy định
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
        ) : (
          <>
            {/* Face ID AI Member Pass */}
            <View style={[styles.passCard, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
              <View style={styles.passTop}>
                <View style={[styles.goldBadge, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
                  <Text style={[styles.goldText, { color: theme.warning, fontFamily: fonts.bodySemiBold }]}>
                    {gymQr?.planName || 'Thẻ hội viên Gym'}
                  </Text>
                </View>
                <Text style={[styles.activeFaceText, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                  {gymQr?.hasCredential ? 'Đang hoạt động' : 'Chưa kích hoạt'}
                </Text>
              </View>

              <View style={styles.memberRow}>
                <Image
                  source={require('../../assets/logo.jpg')}
                  style={[styles.avatar, { borderColor: theme.accent }]}
                  resizeMode="cover"
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                    {user?.fullName || 'Khách'}
                  </Text>
                  <Text style={[styles.memberId, { color: theme.textPrimary, fontFamily: fonts.bodyMedium }]}>
                    {user?.phone || 'Chưa đăng nhập'}
                  </Text>
                  <Text style={[styles.memberExpiry, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                    {gymQr?.endDate
                      ? `Hạn dùng: ${new Date(gymQr.endDate).toLocaleDateString('vi-VN')} (còn ${gymQr.daysRemaining ?? 0} ngày)`
                      : gymQr?.message || 'Đăng ký gói tập để kích hoạt thẻ ra vào cổng xoay'}
                  </Text>
                </View>
              </View>

              {gymCapacity ? (
                <View style={[styles.gateBar, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.gateLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                    Đang tập tại phòng Gym
                  </Text>
                  <Text style={[styles.gateVal, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                    {gymCapacity.insideCount} / {gymCapacity.maxCapacity} người ({gymCapacity.occupancyPercentage}%)
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Gym Plans from DB */}
            {gymPlans.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                  Các gói tập Gym
                </Text>
                <View style={styles.plansGrid}>
                  {gymPlans.map((plan) => (
                    <Pressable
                      key={plan.planType || plan._id}
                      disabled={purchasing}
                      onPress={() => handleBuyGymPlan(plan.planType)}
                      style={({ pressed }) => [
                        styles.planCard,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.planName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                        {plan.name || plan.planType}
                      </Text>
                      <Text style={[styles.planPrice, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                        {(plan.price || 0).toLocaleString('vi-VN')} đ
                      </Text>
                      <Text style={[styles.planAction, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
                        Đăng ký ngay
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 2 Swimming Pools */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                Tổ hợp 2 hồ bơi tiêu chuẩn
              </Text>
              <Text style={[styles.sectionMeta, { color: theme.accent, fontFamily: fonts.bodyMedium }]}>
                {poolStatus?.temperature ? `${poolStatus.temperature} độ C` : 'Lọc Ozone 24/7'}
              </Text>
            </View>

            <View style={[styles.poolCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.poolImgWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80',
                  }}
                  style={styles.poolImg}
                  resizeMode="cover"
                />
                <View style={[styles.poolBadge, { backgroundColor: theme.info }]}>
                  <Text style={[styles.poolBadgeText, { fontFamily: fonts.bodySemiBold }]}>
                    Hồ Olympic 50m (8 làn bơi)
                  </Text>
                </View>
              </View>
              <View style={styles.poolFooter}>
                <View style={styles.poolInfo}>
                  <Text style={[styles.poolTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                    Hồ bơi thi đấu Olympic 50m
                  </Text>
                  <Text style={[styles.poolDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                    Độ sâu 2.0m chuẩn FINA, phao phân làn chống sóng và cứu hộ thường trực
                  </Text>
                </View>
                <Pressable
                  disabled={purchasing}
                  onPress={handleBuyPoolTicket}
                  style={({ pressed }) => [
                    styles.buyBtn,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={[styles.buyText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                    Mua vé lượt
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.poolCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.poolImgWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80',
                  }}
                  style={styles.poolImg}
                  resizeMode="cover"
                />
                <View style={[styles.poolBadge, { backgroundColor: theme.accentSecondary }]}>
                  <Text style={[styles.poolBadgeText, { fontFamily: fonts.bodySemiBold }]}>
                    Bể nước ấm 25m (31.5 độ C)
                  </Text>
                </View>
              </View>
              <View style={styles.poolFooter}>
                <View style={styles.poolInfo}>
                  <Text style={[styles.poolTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                    Bể bơi nước ấm bốn mùa
                  </Text>
                  <Text style={[styles.poolDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                    Gia nhiệt Heat Pump ổn định 31.5 độ C quanh năm, phù hợp tập dưỡng sinh
                  </Text>
                </View>
                <Pressable
                  disabled={purchasing}
                  onPress={handleBuyPoolTicket}
                  style={({ pressed }) => [
                    styles.buyBtn,
                    { backgroundColor: theme.accentSecondary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={[styles.buyText, { color: theme.onAccentSecondary, fontFamily: fonts.bodySemiBold }]}>
                    Mua vé lượt
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Basketball Complex */}
            <View style={[styles.basketballCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.basketballTop}>
                <Text style={[styles.basketballTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                  Cụm bóng rổ tiêu chuẩn BB1 - BB2
                </Text>
              </View>
              <Text style={[styles.basketballDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                Sàn cao su giảm chấn chuẩn FIBA, bảng rổ kính cường lực có lò xo trợ lực và đèn LED 500 Lux ban đêm.
              </Text>
              <Pressable
                onPress={onBook}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceElevated,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.outlineText, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                  Đặt sân bóng rổ
                </Text>
              </Pressable>
            </View>
          </>
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
  ruleText: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  passCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  passTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goldBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  goldText: { fontSize: 11 },
  activeFaceText: { fontSize: 11 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: radius.lg, borderWidth: 1.5 },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 18 },
  memberId: { fontSize: 12 },
  memberExpiry: { fontSize: 11, lineHeight: 16 },
  gateBar: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gateLabel: { fontSize: 12 },
  gateVal: { fontSize: 12 },
  sectionBlock: { gap: spacing.sm },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  planCard: { width: '48.5%', borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  planName: { fontSize: 13 },
  planPrice: { fontSize: 15 },
  planAction: { fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  sectionTitle: { fontSize: 15 },
  sectionMeta: { fontSize: 12 },
  poolCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  poolImgWrap: { height: 128, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  poolImg: { width: '100%', height: '100%' },
  poolBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  poolBadgeText: { fontSize: 10, color: '#FFFFFF' },
  poolFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  poolInfo: { flex: 1, gap: 2 },
  poolTitle: { fontSize: 14 },
  poolDesc: { fontSize: 11, lineHeight: 16 },
  buyBtn: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buyText: { fontSize: 12 },
  basketballCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  basketballTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  basketballTitle: { fontSize: 14, flex: 1 },
  basketballDesc: { fontSize: 12, lineHeight: 18 },
  outlineBtn: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  outlineText: { fontSize: 13 },
});
