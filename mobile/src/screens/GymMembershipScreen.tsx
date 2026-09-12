// mobile/src/screens/GymMembershipScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import QRCode from 'qrcode';
import { colors } from '../theme/colors';
import { api } from '../api/client';

export const GymMembershipScreen: React.FC = () => {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePass, setActivePass] = useState<any | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadPasses();
  }, []);

  // 60-second timer for dynamic QR
  useEffect(() => {
    if (!qrToken) return;
    const interval = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrToken, activePass]);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const data = await api.getMyGymPasses();
      setPasses(data || []);
      const active = data?.find((p: any) => p.status === 'ACTIVE');
      if (active) {
        setActivePass(active);
        fetchQr(active._id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách thẻ Gym:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQr = async (passId: string) => {
    try {
      const res = await api.getGymPassQr(passId);
      setQrToken(res.qrToken);
      setQrSecondsLeft(60);

      const url = await QRCode.toDataURL(res.qrToken, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err: any) {
      Alert.alert('Thông báo', err.message || 'Không thể tạo mã QR vào phòng gym');
    }
  };

  const refreshQr = () => {
    if (activePass) {
      fetchQr(activePass._id);
    }
  };

  const handlePurchase = async (type: 'SINGLE_PASS' | 'MONTHLY_PASS' | 'YEARLY_PASS') => {
    setPurchasing(true);
    try {
      const res = await api.purchaseGymPass(type);
      Alert.alert('Thành công', res.message || 'Mua gói tập thành công!');
      loadPasses();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể mua gói tập');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hội Viên Phòng Gym</Text>
        <Text style={styles.headerSubtitle}>
          Thẻ tập điện tử & Mã QR động vào phòng (Mục 6.1)
        </Text>
      </View>

      {/* Active Pass with Dynamic QR */}
      {activePass && qrToken && (
        <View style={styles.activePassCard}>
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.passType}>
                {activePass.type === 'SINGLE_PASS'
                  ? 'Vé Tập Ngày (1 Lượt)'
                  : activePass.type === 'MONTHLY_PASS'
                  ? 'Gói Tập Tháng (30 Lượt)'
                  : 'Gói Tập Năm (365 Lượt)'}
              </Text>
              <Text style={styles.passExpiry}>
                Hạn dùng: {activePass.expiryDate ? new Date(activePass.expiryDate).toLocaleDateString('vi-VN') : 'Không thời hạn'}
              </Text>
            </View>
            <View style={styles.checkinBadge}>
              <Text style={styles.checkinCount}>{activePass.remainingCheckIns}</Text>
              <Text style={styles.checkinLabel}>lượt còn</Text>
            </View>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              {qrDataUrl ? (
                <Image source={{ uri: qrDataUrl }} style={{ width: 180, height: 180 }} />
              ) : (
                <ActivityIndicator size="large" color={colors.primary} />
              )}
            </View>
            <View style={styles.timerRow}>
              <Text style={styles.timerText}>
                Mã làm mới sau: <Text style={styles.timerSeconds}>{qrSecondsLeft}s</Text>
              </Text>
              <TouchableOpacity onPress={refreshQr} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>Làm mới ngay</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.qrInstruction}>
              Đưa mã này vào cổng quay hoặc màn hình quét tại quầy lễ tân
            </Text>
          </View>
        </View>
      )}

      {/* Packages Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chọn Gói Tập Phù Hợp</Text>
      </View>

      {/* Package 1: Single Pass */}
      <View style={styles.packageCard}>
        <View style={styles.packageInfo}>
          <Text style={styles.packageName}>Vé Tập Lẻ 1 Ngày</Text>
          <Text style={styles.packageDesc}>1 lượt tập trong ngày, sử dụng toàn bộ thiết bị</Text>
          <Text style={styles.packagePrice}>60,000 đ</Text>
        </View>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => handlePurchase('SINGLE_PASS')}
          disabled={purchasing}
        >
          <Text style={styles.buyBtnText}>Mua ngay</Text>
        </TouchableOpacity>
      </View>

      {/* Package 2: Monthly Pass (Popular) */}
      <View style={[styles.packageCard, styles.popularCard]}>
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>PHỔ BIẾN NHẤT</Text>
        </View>
        <View style={styles.packageInfo}>
          <Text style={styles.packageName}>Gói Hội Viên Tháng</Text>
          <Text style={styles.packageDesc}>30 lượt tập, hạn dùng 30 ngày, kèm tủ đồ & nước</Text>
          <Text style={styles.packagePrice}>500,000 đ</Text>
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, styles.popularBuyBtn]}
          onPress={() => handlePurchase('MONTHLY_PASS')}
          disabled={purchasing}
        >
          <Text style={[styles.buyBtnText, styles.popularBuyBtnText]}>Mua ngay</Text>
        </TouchableOpacity>
      </View>

      {/* Package 3: Yearly Pass */}
      <View style={styles.packageCard}>
        <View style={styles.packageInfo}>
          <Text style={styles.packageName}>Gói Hội Viên VIP Năm</Text>
          <Text style={styles.packageDesc}>365 lượt tập cả năm, tặng 2 buổi PT kèm riêng</Text>
          <Text style={styles.packagePrice}>4,500,000 đ</Text>
        </View>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => handlePurchase('YEARLY_PASS')}
          disabled={purchasing}
        >
          <Text style={styles.buyBtnText}>Mua ngay</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  activePassCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  passType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  passExpiry: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkinBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  checkinCount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F97316',
  },
  checkinLabel: {
    fontSize: 10,
    color: '#F97316',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  timerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  timerSeconds: {
    fontWeight: 'bold',
    color: '#F97316',
  },
  refreshBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  qrInstruction: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  popularCard: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  packageInfo: {
    flex: 1,
    paddingRight: 12,
  },
  packageName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  packageDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F97316',
    fontFamily: 'monospace',
  },
  buyBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  popularBuyBtn: {
    backgroundColor: '#F97316',
  },
  popularBuyBtnText: {
    color: '#FFFFFF',
  },
});
