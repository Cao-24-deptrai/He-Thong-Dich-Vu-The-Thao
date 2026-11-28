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
import { Lock, Check, X, ArrowDownLeft, ArrowUpRight, RotateCcw, FileText } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack: () => void;
}

export const WalletScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [balance, setBalance] = useState<number>(0);
  const [heldBalance, setHeldBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadWallet = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.allSettled([
        api.getMyWallet(),
        api.getMyWalletTransactions(),
      ]);
      if (walletRes.status === 'fulfilled' && walletRes.value) {
        setBalance(walletRes.value.balance ?? 0);
        setHeldBalance(walletRes.value.heldBalance ?? 0);
      }
      if (txRes.status === 'fulfilled' && txRes.value) {
        const list = Array.isArray(txRes.value)
          ? txRes.value
          : txRes.value.items || txRes.value.transactions || [];
        setTransactions(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleTopup = async () => {
    try {
      setTopupLoading(true);
      await api.topupWallet(200000, 'Nạp tiền ví Phanta Pay');
      setDialog({
        visible: true,
        title: 'Nạp tiền thành công',
        message: 'Đã nạp 200.000 đ vào Ví Phanta Pay.',
      });
      await loadWallet();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng đăng nhập để nạp tiền.';
      setDialog({ visible: true, title: 'Không thể nạp tiền', message: msg });
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Ví nội bộ Phanta Pay"
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Sổ cái bất biến',
                message:
                  'Sổ cái ghi nhận mọi giao dịch nạp, rút, thanh toán và hoàn tiền cọc từ cơ sở dữ liệu.',
              })
            }
            accessibilityLabel="Thông tin sổ cái"
            style={styles.infoIconBtn}
          >
            <FileText size={18} strokeWidth={1.75} color={theme.accent} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.borderAccent }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
            Số dư khả dụng
          </Text>
          <Text style={[styles.balanceValue, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            {balance.toLocaleString('vi-VN')}{' '}
            <Text style={{ color: theme.accent, fontSize: 14, fontFamily: fonts.headingBold }}>VND</Text>
          </Text>

          {heldBalance > 0 ? (
            <View style={[styles.holdBadge, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
              <Lock size={13} strokeWidth={1.75} color={theme.warning} />
              <Text style={[styles.holdText, { color: theme.warning, fontFamily: fonts.bodyMedium }]}>
                Đang tạm giữ ký quỹ: {heldBalance.toLocaleString('vi-VN')} VND
              </Text>
            </View>
          ) : null}

          <View style={styles.ctaRow}>
            <Pressable
              disabled={topupLoading}
              onPress={handleTopup}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                + Nạp 200K VietQR
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setDialog({
                  visible: true,
                  title: 'Rút tiền về ngân hàng',
                  message: 'Vui lòng liên hệ quầy hoặc xác thực OTP để rút số dư khả dụng.',
                })
              }
              style={({ pressed }) => [
                styles.outlineBtn,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.accentSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.outlineBtnText, { color: theme.accentSecondary, fontFamily: fonts.bodySemiBold }]}>
                Rút tiền (OTP)
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.rulesCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <Text style={[styles.rulesTitle, { color: theme.accent, fontFamily: fonts.headingBold }]}>
            Phạm vi chi tiêu ví Phanta Pay
          </Text>
          <View style={styles.ruleRow}>
            <Check size={14} strokeWidth={2} color={theme.accent} />
            <Text style={[styles.ruleText, { color: theme.textPrimary, fontFamily: fonts.body }]}>
              Được dùng cho: Đặt sân thể thao, thuê dụng cụ, nước uống canteen, giờ chơi gaming sảnh.
            </Text>
          </View>
          <View style={styles.ruleRow}>
            <X size={14} strokeWidth={2} color={theme.danger} />
            <Text style={[styles.ruleText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Không áp dụng cho: Thẻ hội viên gym dài hạn, sản phẩm thể thao bán đứt.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
          Lịch sử biến động (sổ cái)
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.lg }} />
        ) : transactions.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Chưa có giao dịch nào trong sổ cái ví.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx: any) => {
              const type = (tx.type || '').toUpperCase();
              const isPositive = type === 'TOPUP' || type === 'REFUND' || type === 'RELEASE' || tx.amount > 0;
              const badgeColor = isPositive ? theme.accent : theme.accentSecondary;
              const badgeBg = isPositive ? theme.accentSoft : theme.accentSecondarySoft;

              return (
                <View
                  key={tx._id}
                  style={[styles.txCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={styles.txLeft}>
                    <View style={[styles.txIcon, { backgroundColor: badgeBg }]}>
                      {type === 'TOPUP' ? (
                        <ArrowDownLeft size={16} strokeWidth={1.75} color={badgeColor} />
                      ) : type === 'REFUND' ? (
                        <RotateCcw size={15} strokeWidth={1.75} color={badgeColor} />
                      ) : type === 'HOLD' ? (
                        <Lock size={15} strokeWidth={1.75} color={badgeColor} />
                      ) : (
                        <ArrowUpRight size={16} strokeWidth={1.75} color={badgeColor} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txTitle, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                        {tx.note || tx.category || tx.type}
                      </Text>
                      <Text style={[styles.txTime, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : ''}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.txAmount, { color: badgeColor, fontFamily: fonts.headingBold }]}>
                    {isPositive ? '+' : '-'}
                    {Math.abs(tx.amount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              );
            })}
          </View>
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
  infoIconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  balanceCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  balanceLabel: { fontSize: 12 },
  balanceValue: { fontSize: 30 },
  holdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  holdText: { fontSize: 11 },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.sm },
  primaryBtn: { flex: 1, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 13 },
  outlineBtn: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 13 },
  rulesCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  rulesTitle: { fontSize: 13 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ruleText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 15, marginTop: spacing.xs },
  emptyBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  txList: { gap: spacing.sm },
  txCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  txIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13 },
  txTime: { fontSize: 11, marginTop: 1 },
  txAmount: { fontSize: 14 },
});
