import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { Voucher } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack?: () => void;
  onSelectVoucher?: (voucher: Voucher) => void;
}

export const VouchersScreen: React.FC<Props> = ({ onBack, onSelectVoucher }) => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const { activeBooking, setAppliedVoucher } = useBookingStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [customCode, setCustomCode] = useState('');
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    const loadVouchers = async () => {
      try {
        setLoading(true);
        const list = await api.getVouchers(true);
        setVouchers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load vouchers:', err);
        setVouchers([]);
      } finally {
        setLoading(false);
      }
    };
    loadVouchers();
  }, []);

  const handleApply = async (v: Voucher) => {
    const orderAmount = activeBooking?.totalPrice || 500000;
    try {
      const validation = await api.validateVoucher(v.code, orderAmount);
      if (validation.valid) {
        setAppliedVoucher(v, validation.discountAmount);
        onSelectVoucher?.(v);
      } else {
        setDialog({
          visible: true,
          title: 'Không thể áp dụng mã',
          message: validation.reason || 'Đơn hàng chưa đủ điều kiện áp dụng mã này.',
        });
      }
    } catch {
      const discount =
        v.discountType === 'FIXED'
          ? v.discountValue
          : Math.round((orderAmount * v.discountValue) / 100);
      setAppliedVoucher(v, discount);
      onSelectVoucher?.(v);
    }
  };

  const handleCustomApply = async () => {
    const code = customCode.trim().toUpperCase();
    if (!code) return;
    try {
      const orderAmount = activeBooking?.totalPrice || 500000;
      const res = await api.validateVoucher(code, orderAmount);
      if (res.valid && res.voucher) {
        setAppliedVoucher(res.voucher, res.discountAmount);
        onSelectVoucher?.(res.voucher);
      } else {
        setDialog({
          visible: true,
          title: 'Không thể áp dụng mã',
          message: res.reason || 'Mã ưu đãi không hợp lệ.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mã ưu đãi không tồn tại.';
      setDialog({ visible: true, title: 'Không thể áp dụng mã', message: msg });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Kho Voucher và mã giảm giá"
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Quy định Voucher',
                message:
                  'Mỗi đơn đặt sân được áp dụng tối đa 1 mã giảm giá. Dữ liệu ưu đãi được đồng bộ trực tiếp từ hệ thống.',
              })
            }
          >
            <Text style={[styles.ruleLink, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
              Quy định
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <View style={[styles.inputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
            Nhập mã giảm giá trực tiếp
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              value={customCode}
              onChangeText={setCustomCode}
              placeholder="Nhập mã ưu đãi"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.textHeading,
                  fontFamily: fonts.bodyMedium,
                },
              ]}
            />
            <Pressable
              onPress={handleCustomApply}
              style={({ pressed }) => [
                styles.applyBtn,
                { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.applyText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
                Áp dụng
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
            Mã giảm giá hiện có ({vouchers.length})
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: spacing.xl }} />
        ) : vouchers.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              Hiện chưa có voucher nào đang hoạt động.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {vouchers.map((v) => {
              const expiry = v.validUntil
                ? new Date(v.validUntil).toLocaleDateString('vi-VN')
                : 'Không giới hạn';
              return (
                <View
                  key={v._id}
                  style={[
                    styles.voucherCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.borderAccent,
                    },
                  ]}
                >
                  <View style={styles.voucherContent}>
                    <View
                      style={[
                        styles.codeBadge,
                        {
                          backgroundColor: theme.accentSoft,
                          borderColor: theme.borderAccent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.codeText,
                          { color: theme.accent, fontFamily: fonts.headingBold },
                        ]}
                      >
                        {v.code}
                      </Text>
                    </View>

                    <Text style={[styles.voucherTitle, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                      {v.title}
                    </Text>
                    <Text style={[styles.voucherDesc, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      {v.description}
                    </Text>
                    <Text style={[styles.metaText, { color: theme.textPrimary, fontFamily: fonts.bodyMedium }]}>
                      Hạn dùng: {expiry}
                    </Text>
                    {v.minOrderValue ? (
                      <Text style={[styles.metaSub, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                        Đơn tối thiểu: {v.minOrderValue.toLocaleString('vi-VN')} đ
                      </Text>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => handleApply(v)}
                    style={({ pressed }) => [
                      styles.voucherActionBtn,
                      {
                        backgroundColor: theme.accent,
                        borderColor: theme.accent,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.voucherActionText,
                        { color: theme.onAccent, fontFamily: fonts.bodySemiBold },
                      ]}
                    >
                      Áp dụng
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={[styles.topBtn, { borderColor: theme.border }]}
        >
          <ArrowUp size={15} strokeWidth={1.75} color={theme.textSecondary} />
          <Text style={[styles.topBtnText, { color: theme.textSecondary, fontFamily: fonts.bodyMedium }]}>
            Quay về đầu trang
          </Text>
        </Pressable>
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
  ruleLink: { fontSize: 12 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  inputCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  inputLabel: { fontSize: 12 },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: 13 },
  applyBtn: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 13 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  listTitle: { fontSize: 15 },
  emptyBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  list: { gap: spacing.md },
  voucherCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  voucherContent: { flex: 1, gap: 4 },
  codeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  codeText: { fontSize: 11 },
  voucherTitle: { fontSize: 14, marginTop: 2 },
  voucherDesc: { fontSize: 12 },
  metaText: { fontSize: 11, marginTop: 2 },
  metaSub: { fontSize: 11 },
  voucherActionBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherActionText: { fontSize: 12 },
  topBtn: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  topBtnText: { fontSize: 12 },
});
