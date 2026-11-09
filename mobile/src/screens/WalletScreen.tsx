// mobile/src/screens/WalletScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface LedgerItem {
  id: string;
  type: 'TOPUP' | 'PAYMENT' | 'REFUND';
  title: string;
  subtitle: string;
  amount: number;
  time: string;
  balanceAfter: number;
}

export const WalletScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [balance, setBalance] = useState<number>(2450000);

  const transactions: LedgerItem[] = [
    {
      id: 'TX-901',
      type: 'REFUND',
      title: 'Hoàn Tiền Cọc Hủy Sân Tức Thì',
      subtitle: 'Hủy trước 12h / Sân bóng mini F1',
      amount: 150000,
      time: '14:20 26/10/2026',
      balanceAfter: 2450000,
    },
    {
      id: 'TX-900',
      type: 'PAYMENT',
      title: 'Thanh Toán Đặt Sân Cầu Lông #2',
      subtitle: 'Trừ trực tiếp ví Phanta Pay / 90 phút',
      amount: -240000,
      time: '09:15 25/10/2026',
      balanceAfter: 2300000,
    },
    {
      id: 'TX-899',
      type: 'TOPUP',
      title: 'Nạp Tiền Qua VietQR PayOS',
      subtitle: 'Chuyển khoản MB Bank khớp lệnh tự động',
      amount: 1000000,
      time: '20:30 24/10/2026',
      balanceAfter: 2540000,
    },
    {
      id: 'TX-898',
      type: 'PAYMENT',
      title: 'Mua Nước & Thuê Bóng Căng Tin',
      subtitle: 'Hóa đơn POS Canteen tại quầy 01',
      amount: -65000,
      time: '18:45 23/10/2026',
      balanceAfter: 1540000,
    },
  ];

  const handleTopup = (amt: number) => {
    Alert.alert(
      'Nạp Tiền Ví Phanta Pay',
      `Khởi tạo giao dịch nạp ${amt.toLocaleString('vi-VN')} đ qua cổng VietQR PayOS.\nSố dư sẽ tự động cộng tức thì trong 3 giây sau khi thanh toán.`,
      [
        {
          text: 'Mở VietQR',
          onPress: () => {
            setBalance((prev) => prev + amt);
            Alert.alert('Thành Công', `Đã nạp +${amt.toLocaleString('vi-VN')} đ vào ví Phanta Pay!`);
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <TwoLineText
            primary="Ví Điện Tử Phanta Pay"
            secondary="Số dư lưu hành & Sổ cái kế toán minh bạch"
            badge="BẢO MẬT 256-BIT"
            badgeColor={colors.primary}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Main Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Số Dư Khả Dụng</Text>
            <Text style={styles.balanceAmount}>{balance.toLocaleString('vi-VN')} đ</Text>
            <Text style={styles.balanceSub}>Hội viên Vàng / Chi tiêu không giới hạn cụm sân</Text>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleTopup(200000)}>
                <Text style={styles.actionBtnText}>+200K</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleTopup(500000)}>
                <Text style={styles.actionBtnText}>+500K</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnMain]} onPress={() => handleTopup(1000000)}>
                <Text style={styles.actionBtnMainText}>+1.000K Nạp VietQR</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallet Rules */}
          <View style={styles.ruleCard}>
            <TwoLineText
              primary="Quy Định Hoàn Tiền Tức Thì"
              secondary="Hủy sân trước 12 giờ: Tiền cọc tự động hoàn 100% vào ví trong 3 giây. Dữ liệu ghi sổ cái không thể xóa sửa."
              primaryStyle={{ fontSize: 13, color: '#38bdf8' }}
              secondaryStyle={{ fontSize: 11, color: '#cbd5e1' }}
            />
          </View>

          {/* Transaction Ledger */}
          <Text style={styles.sectionTitle}>Sổ Cái Biến Động Số Dư</Text>
          <View style={styles.ledgerList}>
            {transactions.map((tx) => {
              const isPlus = tx.amount > 0;
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIcon, { backgroundColor: isPlus ? '#052e16' : '#450a0a' }]}>
                      <Text style={{ color: isPlus ? colors.success : colors.danger, fontWeight: '900', fontSize: 16 }}>
                        {isPlus ? '↓' : '↑'}
                      </Text>
                    </View>
                    <View style={styles.txInfo}>
                      <TwoLineText
                        primary={tx.title}
                        secondary={tx.subtitle}
                        primaryStyle={{ fontSize: 13 }}
                        secondaryStyle={{ fontSize: 11 }}
                      />
                      <Text style={styles.txTime}>{tx.time}</Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: isPlus ? colors.success : '#fff' }]}>
                      {isPlus ? '+' : ''}{tx.amount.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={styles.txBalanceAfter}>Dư: {tx.balanceAfter.toLocaleString('vi-VN')} đ</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scroll: { paddingBottom: 30 },
  balanceCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: colors.primary + '50',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  balanceAmount: { fontSize: 30, fontWeight: '900', color: colors.primary, marginVertical: 6 },
  balanceSub: { fontSize: 11, color: '#94a3b8' },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionBtnMain: { flex: 1, backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnMainText: { color: '#000', fontSize: 12, fontWeight: '800' },
  ruleCard: {
    backgroundColor: '#0c4a6e25',
    borderWidth: 1,
    borderColor: '#0284c740',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
  ledgerList: { gap: 10 },
  txCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txTime: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end', marginLeft: 8 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txBalanceAfter: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
});
