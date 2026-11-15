// mobile/src/screens/PaymentScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { PaymentLinkResponse } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { subscribeSlotChanges } from '../socket/socket';
import QRCode from 'qrcode';

interface Props {
  onBack: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentScreen: React.FC<Props> = ({ onBack, onPaymentSuccess }) => {
  const { activeBooking, selectedFacility, selectedVenue, setPaymentData, paymentData } = useBookingStore();

  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Initialize Payment Link
  useEffect(() => {
    if (!activeBooking) return;

    const initPayment = async () => {
      try {
        setLoading(true);
        const data = await api.createPaymentLink(activeBooking._id);
        setPaymentData(data);

        // Generate QR code data URL from payos qrCode string
        if (data.qrCode) {
          const url = await QRCode.toDataURL(data.qrCode, {
            width: 260,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrDataUrl(url);
        }
      } catch (err: any) {
        console.error('Failed to create payment link:', err);
        Alert.alert('Lỗi tạo thanh toán', err.message || 'Không thể tạo mã VietQR');
      } finally {
        setLoading(false);
      }
    };

    initPayment();
  }, [activeBooking]);

  // 10-minute hold countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      Alert.alert('Hết giờ giữ chỗ', 'Thời gian giữ chỗ 10 phút đã hết. Vui lòng chọn lại khung giờ.', [
        { text: 'Đồng ý', onPress: onBack },
      ]);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Real-time listener: When Webhook completes, slot status changes to CONFIRMED
  useEffect(() => {
    if (!activeBooking) return;

    const unsubscribe = subscribeSlotChanges((data) => {
      if (
        data.venueId === (activeBooking.venueId._id || activeBooking.venueId) &&
        data.startTime === activeBooking.startTime &&
        data.status === 'CONFIRMED'
      ) {
        Alert.alert('Thanh toán thành công! 🎉', 'Hệ thống đã xác nhận thanh toán PayOS. Vé vào sân của bạn đã sẵn sàng!');
        onPaymentSuccess();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeBooking]);

  // Manual Check Button
  const handleCheckPayment = async () => {
    if (!activeBooking) return;
    setVerifying(true);
    try {
      const bookings = await api.getMyBookings();
      const current = bookings.find((b) => b._id === activeBooking._id);
      if (current && current.status === 'CONFIRMED') {
        onPaymentSuccess();
      } else {
        Alert.alert('Đang chờ xử lý', 'Chưa nhận được xác nhận từ ngân hàng. Nếu bạn vừa chuyển khoản, vui lòng đợi 5-10 giây.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi kiểm tra', err.message);
    } finally {
      setVerifying(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.topBarInfo}>
            <Text style={styles.topBarTitle}>Thanh Toán VietQR PayOS</Text>
            <Text style={styles.topBarSubtitle}>Mục 3.1 & 5.3: Giữ chỗ tự động 10 phút</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Countdown Warning Banner */}
          <View style={styles.timerBanner}>
            <View style={styles.timerIconBox}>
              <Text style={styles.timerIcon}>⏳</Text>
            </View>
            <View style={styles.timerInfo}>
              <Text style={styles.timerTitle}>Thời gian giữ chỗ còn lại:</Text>
              <Text style={styles.timerCount}>{formatTimer(timeLeft)}</Text>
            </View>
          </View>

          {/* Booking Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>THÔNG TIN ĐẶT CHỖ</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cơ sở:</Text>
              <Text style={styles.summaryVal}>{selectedFacility?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sân:</Text>
              <Text style={styles.summaryVal}>{selectedVenue?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thời gian:</Text>
              <Text style={styles.summaryVal}>
                {activeBooking?.startTime} - {activeBooking?.endTime} ({activeBooking?.bookingDate?.split('T')[0]})
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Tổng thanh toán:</Text>
              <Text style={styles.summaryTotalVal}>
                {activeBooking?.totalPrice?.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>

          {/* VietQR Display Card */}
          <View style={styles.qrCard}>
            <Text style={styles.qrCardTitle}>QUÉT MÃ VIETQR ĐỂ THANH TOÁN</Text>
            <Text style={styles.qrCardSub}>Tương thích mọi App ngân hàng & Ví điện tử</Text>

            {loading ? (
              <View style={styles.qrLoadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tạo mã VietQR PayOS...</Text>
              </View>
            ) : qrDataUrl ? (
              <View style={styles.qrImageWrapper}>
                <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
                <View style={styles.payOsBadge}>
                  <Text style={styles.payOsBadgeText}>⚡ Powered by PayOS</Text>
                </View>
              </View>
            ) : (
              <View style={styles.qrFallback}>
                <Text style={styles.qrFallbackText}>Không thể hiển thị mã QR. Vui lòng thử lại.</Text>
              </View>
            )}

            {/* Bank details info */}
            {paymentData && (
              <View style={styles.bankDetails}>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Chủ tài khoản:</Text>
                  <Text style={styles.bankVal}>{paymentData.accountName || 'CONG TY SPORTS BOOKING'}</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Số tài khoản:</Text>
                  <Text style={styles.bankValHighlight}>{paymentData.accountNumber || '0911223344'}</Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Số tiền:</Text>
                  <Text style={styles.bankValPrice}>
                    {activeBooking?.totalPrice?.toLocaleString('vi-VN')} VNĐ
                  </Text>
                </View>
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankLabel}>Nội dung CK:</Text>
                  <Text style={styles.bankValCode}>{paymentData.description || `SB ${activeBooking?._id?.slice(-8)}`}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.checkBtn}
            disabled={verifying}
            onPress={handleCheckPayment}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkBtnText}>Tôi Đã Chuyển Khoản Thành Công ✓</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnText: {
    fontSize: 20,
    color: '#fff',
  },
  topBarInfo: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 16,
  },
  timerIconBox: {
    marginRight: 12,
  },
  timerIcon: {
    fontSize: 24,
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timerCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryLight,
    fontFamily: 'monospace',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  qrCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  qrCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  qrLoadingBox: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
  },
  qrImageWrapper: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrImage: {
    width: 240,
    height: 240,
  },
  payOsBadge: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payOsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  qrFallback: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFallbackText: {
    color: '#ef4444',
    fontSize: 12,
  },
  bankDetails: {
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  bankVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },
  bankValHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    fontFamily: 'monospace',
  },
  bankValPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'monospace',
  },
  bankValCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    fontFamily: 'monospace',
  },
  checkBtn: {
    backgroundColor: colors.success,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
