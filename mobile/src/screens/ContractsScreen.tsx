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
import { FileText } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { api } from '../api/client';
import { Booking } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppDialog } from '../components/AppDialog';

interface Props {
  onBack?: () => void;
}

export const ContractsScreen: React.FC<Props> = ({ onBack }) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'HELD'>('ALL');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadContracts = async () => {
    try {
      setLoading(true);
      const list = await api.getMyBookings();
      setBookings(Array.isArray(list) ? list : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const recurringBookings = bookings.filter((b: any) => b.recurringGroupId || b.isRecurring);
  const displayList = recurringBookings.length > 0 ? recurringBookings : bookings;

  const filtered = displayList.filter((b) => {
    if (filter === 'CONFIRMED') return b.status === 'CONFIRMED' || b.status === 'COMPLETED';
    if (filter === 'HELD') return b.status === 'HELD';
    return true;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Hợp đồng thuê cố định"
        onBack={onBack}
        rightElement={
          <Pressable
            onPress={() =>
              setDialog({
                visible: true,
                title: 'Ký hợp đồng định kỳ',
                message: 'Để tạo lịch thuê cố định nhiều tuần, chọn sân thi đấu và xác nhận chuỗi lịch qua tổng đài hoặc quầy.',
              })
            }
            style={[styles.newBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.newBtnText, { color: theme.onAccent, fontFamily: fonts.bodySemiBold }]}>
              + Ký mới
            </Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={[styles.bannerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.bannerTop}>
            <FileText size={16} strokeWidth={1.75} color={theme.accent} />
            <Text style={[styles.bannerTitle, { color: theme.accent, fontFamily: fonts.headingBold }]}>
              Đặc quyền thuê cố định dài hạn
            </Text>
          </View>
          <View style={styles.privilegesList}>
            <Text style={[styles.privItem, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              - Giữ khung giờ cố định đúng lịch đã ký
            </Text>
            <Text style={[styles.privItem, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              - Chiết khấu 15 - 20% so với đặt lẻ
            </Text>
            <Text style={[styles.privItem, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              - Đổi bù lịch linh hoạt khi trời mưa
            </Text>
            <Text style={[styles.privItem, { color: theme.textSecondary, fontFamily: fonts.body }]}>
              - Xuất hóa đơn VAT cho doanh nghiệp
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { key: 'ALL' as const, label: `Tất cả (${displayList.length})` },
            { key: 'CONFIRMED' as const, label: 'Đang hiệu lực' },
            { key: 'HELD' as const, label: 'Chờ thanh toán' },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
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
                    { color: active ? theme.onAccent : theme.textSecondary, fontFamily: fonts.bodySemiBold },
                  ]}
                >
                  {tab.label}
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
              Chưa có hợp đồng hoặc lịch thuê cố định nào trong tài khoản của bạn.
            </Text>
          </View>
        ) : (
          filtered.map((b: any) => {
            const isPending = b.status === 'HELD';
            return (
              <View
                key={b._id}
                style={[styles.contractCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.contractTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.codeRow}>
                      <Text
                        style={[
                          styles.codeText,
                          { color: isPending ? theme.warning : theme.accent, fontFamily: fonts.bodySemiBold },
                        ]}
                      >
                        #{(b.recurringGroupId || b._id).slice(-8).toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: isPending ? theme.warningSoft : theme.successSoft },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: isPending ? theme.warning : theme.success, fontFamily: fonts.bodySemiBold },
                          ]}
                        >
                          {b.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.clubName, { color: theme.textHeading, fontFamily: fonts.headingBold }]}>
                      {b.venueId?.name || 'Lịch đặt sân cố định'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.infoBox, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Ngày thi đấu
                    </Text>
                    <Text style={[styles.infoVal, { color: theme.textHeading, fontFamily: fonts.bodySemiBold }]}>
                      {b.bookingDate}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Khung giờ
                    </Text>
                    <Text style={[styles.infoVal, { color: theme.accent, fontFamily: fonts.bodySemiBold }]}>
                      {b.startTime} - {b.endTime}
                    </Text>
                  </View>
                </View>

                <View style={[styles.contractFooter, { borderTopColor: theme.borderSubtle }]}>
                  <View>
                    <Text style={[styles.amountLabel, { color: theme.textSecondary, fontFamily: fonts.body }]}>
                      Giá trị kỳ
                    </Text>
                    <Text style={[styles.amountValue, { color: theme.accent, fontFamily: fonts.headingBold }]}>
                      {(b.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
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
  newBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  newBtnText: { fontSize: 11 },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  bannerCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerTitle: { fontSize: 13 },
  privilegesList: { gap: 3, marginTop: 4 },
  privItem: { fontSize: 12, lineHeight: 17 },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center' },
  filterText: { fontSize: 12 },
  emptyBox: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  contractCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  contractTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  codeText: { fontSize: 11 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  statusText: { fontSize: 10 },
  clubName: { fontSize: 16, marginTop: 4 },
  infoBox: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  infoLabel: { fontSize: 12 },
  infoVal: { fontSize: 12 },
  contractFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  amountLabel: { fontSize: 11 },
  amountValue: { fontSize: 15 },
});
