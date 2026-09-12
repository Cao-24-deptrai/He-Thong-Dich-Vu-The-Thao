// mobile/src/screens/TicketScreen.tsx
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
import { QrTokenResponse } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import QRCode from 'qrcode';

interface Props {
  bookingId?: string;
  onBack: () => void;
}

export const TicketScreen: React.FC<Props> = ({ bookingId, onBack }) => {
  const { activeBooking, selectedFacility, selectedVenue } = useBookingStore();
  const targetId = bookingId || activeBooking?._id;

  const [ticketData, setTicketData] = useState<QrTokenResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [loading, setLoading] = useState(true);

  // Fetch or refresh dynamic QR code (60s dynamic JWT - Mục 4.5 & 5.4)
  const fetchDynamicQr = async () => {
    if (!targetId) return;
    try {
      const res = await api.getDynamicQr(targetId);
      setTicketData(res);
      setSecondsRemaining(60);

      const url = await QRCode.toDataURL(res.qrToken, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err: any) {
      console.error('Failed to load dynamic QR ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDynamicQr();
  }, [targetId]);

  // 60-second auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchDynamicQr(); // Auto refresh when expired
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetId]);

  const progressPct = (secondsRemaining / 60) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.topBarInfo}>
            <Text style={styles.topBarTitle}>Vé Vào Sân Điện Tử</Text>
            <Text style={styles.topBarSubtitle}>Dynamic QR Code 60 giây (Mục 4.5 & 5.4)</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Ticket Pass Card */}
          <View style={styles.ticketCard}>
            {/* Ticket Header */}
            <View style={styles.ticketHeader}>
              <View>
                <Text style={styles.facilityText}>{selectedFacility?.name || 'Cơ sở Thể Thao'}</Text>
                <Text style={styles.venueText}>{ticketData?.booking?.venue?.name || selectedVenue?.name || 'Sân Thể Thao'}</Text>
              </View>
              <View style={styles.ticketCodeBadge}>
                <Text style={styles.ticketCodeText}>
                  #{targetId ? targetId.slice(-6).toUpperCase() : 'PASS'}
                </Text>
              </View>
            </View>

            {/* Status Banner */}
            {ticketData?.isCheckedIn ? (
              <View style={styles.checkedInBanner}>
                <Text style={styles.checkedInText}>✓ ĐÃ CHECK-IN VÀO SÂN</Text>
                <Text style={styles.checkedInTime}>
                  {ticketData.checkedInAt
                    ? new Date(ticketData.checkedInAt).toLocaleTimeString('vi-VN')
                    : 'Hợp lệ'}
                </Text>
              </View>
            ) : (
              <View style={styles.readyBanner}>
                <Text style={styles.readyText}>⚡ SẴN SÀNG QUÉT CHECK-IN TẠI QUẦY</Text>
              </View>
            )}

            {/* QR Code Container */}
            <View style={styles.qrSection}>
              {loading ? (
                <View style={styles.qrLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.qrLoadingText}>Đang tạo vé bảo mật...</Text>
                </View>
              ) : qrDataUrl ? (
                <View style={styles.qrWrapper}>
                  <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
                </View>
              ) : (
                <Text style={styles.errorText}>Không thể tạo mã vé QR</Text>
              )}

              {/* 60-Second Auto Refresh Timer Bar */}
              <View style={styles.refreshBarWrapper}>
                <View style={styles.refreshBarHeader}>
                  <Text style={styles.refreshBarLabel}>Tự làm mới bảo mật:</Text>
                  <Text style={styles.refreshBarCount}>{secondsRemaining}s</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                </View>
              </View>

              <Text style={styles.securityNotice}>
                🔒 Mã QR tự đổi mỗi 60s để chống chụp màn hình. Vui lòng đưa màn hình cho lễ tân quét.
              </Text>
            </View>

            {/* Perforated Divider */}
            <View style={styles.perforatedLine} />

            {/* Ticket Details */}
            <View style={styles.ticketDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ngày chơi:</Text>
                <Text style={styles.detailVal}>
                  {ticketData?.booking?.bookingDate?.split('T')[0] || activeBooking?.bookingDate?.split('T')[0]}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Khung giờ:</Text>
                <Text style={styles.detailValHighlight}>
                  {ticketData?.booking?.startTime || activeBooking?.startTime} - {ticketData?.booking?.endTime || activeBooking?.endTime}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Giá vé đã thanh toán:</Text>
                <Text style={styles.detailValPrice}>
                  {(ticketData?.booking?.totalPrice || activeBooking?.totalPrice)?.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>
          </View>

          {/* Refresh Action Button */}
          <TouchableOpacity style={styles.manualRefreshBtn} onPress={fetchDynamicQr}>
            <Text style={styles.manualRefreshText}>🔄 Làm mới mã QR ngay bây giờ</Text>
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
    alignItems: 'center',
  },
  ticketCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  ticketHeader: {
    backgroundColor: colors.surface,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facilityText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  venueText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  ticketCodeBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  ticketCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryLight,
    fontFamily: 'monospace',
  },
  readyBanner: {
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  readyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  checkedInBanner: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  checkedInText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  checkedInTime: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
  qrSection: {
    padding: 24,
    alignItems: 'center',
  },
  qrLoadingBox: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748b',
  },
  qrWrapper: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  refreshBarWrapper: {
    width: '100%',
    marginTop: 16,
  },
  refreshBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  refreshBarLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  refreshBarCount: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  securityNotice: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 15,
  },
  perforatedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  ticketDetails: {
    padding: 20,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  detailValHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  detailValPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'monospace',
  },
  manualRefreshBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualRefreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
