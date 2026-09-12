// mobile/src/screens/TicketScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Animated,
  Easing,
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

  // Animated Laser Beam
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [laserAnim]);

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  // Fetch or refresh dynamic QR code (60s dynamic JWT)
  const fetchDynamicQr = async () => {
    if (!targetId) return;
    try {
      const res = await api.getDynamicQr(targetId);
      setTicketData(res);
      setSecondsRemaining(60);

      const url = await QRCode.toDataURL(res.qrToken, {
        width: 240,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
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
          fetchDynamicQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetId]);

  const progressPct = (secondsRemaining / 60) * 100;
  const isCheckedIn = ticketData?.isCheckedIn;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.topBarInfo}>
            <Text style={styles.topBarTitle}>Thẻ Vé Vào Sân Điện Tử</Text>
            <Text style={styles.topBarSubtitle}>Apple Wallet Style • Dynamic 60s QR Token</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Apple Wallet Ticket Card */}
          <View style={styles.walletCardContainer}>
            {/* Top Pass Header */}
            <View style={styles.passHeader}>
              <View style={styles.passHeaderTopRow}>
                <View style={styles.brandRow}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgeText}>SPORT PASS</Text>
                  </View>
                  <Text style={styles.facilityName} numberOfLines={1}>
                    {selectedFacility?.name || 'Cơ sở Thể Thao'}
                  </Text>
                </View>
                <View style={styles.vipTag}>
                  <Text style={styles.vipTagText}>VIP ACCESS</Text>
                </View>
              </View>

              {/* Venue Name & Pass ID */}
              <View style={styles.venueRow}>
                <View>
                  <Text style={styles.venueLabel}>VỊ TRÍ / SÂN ĐẤU</Text>
                  <Text style={styles.venueName}>
                    {ticketData?.booking?.venue?.name || selectedVenue?.name || 'Sân Thể Thao'}
                  </Text>
                </View>
                <View style={styles.passIdBox}>
                  <Text style={styles.passIdLabel}>MÃ VÉ</Text>
                  <Text style={styles.passIdValue}>
                    #{targetId ? targetId.slice(-6).toUpperCase() : 'PASS'}
                  </Text>
                </View>
              </View>

              {/* Boarding Itinerary Route */}
              <View style={styles.routeContainer}>
                <View style={styles.routeStop}>
                  <View style={[styles.routeDot, styles.routeDotActive]} />
                  <Text style={styles.routeText}>CHECK-IN</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeStop}>
                  <View style={[styles.routeDot, isCheckedIn && styles.routeDotActive]} />
                  <Text style={styles.routeText}>VÀO CỔNG</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeStop}>
                  <View style={[styles.routeDot, isCheckedIn && styles.routeDotActive]} />
                  <Text style={styles.routeText}>RA SÂN</Text>
                </View>
              </View>
            </View>

            {/* Apple Wallet Perforated Tear Notch Line */}
            <View style={styles.perforatedSection}>
              <View style={styles.notchLeft} />
              <View style={styles.tearDashedLine} />
              <View style={styles.notchRight} />
            </View>

            {/* Middle QR Code Section */}
            <View style={styles.qrSection}>
              {/* Ready / Checked In Badge */}
              {isCheckedIn ? (
                <View style={styles.checkedInBanner}>
                  <Text style={styles.checkedInText}>✓ ĐÃ CHECK-IN THÀNH CÔNG</Text>
                  <Text style={styles.checkedInSub}>
                    {ticketData?.checkedInAt
                      ? new Date(ticketData.checkedInAt).toLocaleTimeString('vi-VN')
                      : 'Hợp lệ'}
                  </Text>
                </View>
              ) : (
                <View style={styles.scanReadyBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.scanReadyText}>ĐƯA MÃ NÀY CHO LỄ TÂN HOẶC CỔNG QUÉT</Text>
                </View>
              )}

              {/* Holographic QR Scanner Box */}
              <View style={styles.scannerWrapper}>
                {/* 4 Glowing Corner Brackets */}
                <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
                <View style={[styles.cornerBracket, styles.cornerTopRight]} />
                <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
                <View style={[styles.cornerBracket, styles.cornerBottomRight]} />

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#00f2fe" />
                    <Text style={styles.loadingText}>Đang khởi tạo mã bảo mật...</Text>
                  </View>
                ) : qrDataUrl ? (
                  <View style={styles.qrImageContainer}>
                    <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />

                    {/* Animated Neon Laser Scan Beam */}
                    {!isCheckedIn && (
                      <Animated.View
                        style={[
                          styles.laserBeamContainer,
                          { transform: [{ translateY: laserTranslateY }] },
                        ]}
                      >
                        <View style={styles.laserBeamGlow} />
                        <View style={styles.laserBeamLine} />
                      </Animated.View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.errorText}>Không thể tải mã QR vé</Text>
                )}

                {/* Checked-In Holographic Watermark Stamp */}
                {isCheckedIn && (
                  <View style={styles.watermarkStamp}>
                    <Text style={styles.stampTextMain}>VERIFIED</Text>
                    <Text style={styles.stampTextSub}>ĐÃ VÀO SÂN</Text>
                  </View>
                )}
              </View>

              {/* 60-Second Dynamic Token Countdown */}
              <View style={styles.countdownSection}>
                <View style={styles.countdownHeader}>
                  <View style={styles.countdownLabelRow}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={styles.countdownLabel}>Mã động làm mới sau:</Text>
                  </View>
                  <Text style={styles.countdownSeconds}>{secondsRemaining}s</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progressPct}%`,
                        backgroundColor: secondsRemaining < 10 ? '#ef4444' : '#00f2fe',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.securityHint}>
                  Token tự đổi mỗi 60 giây để chống chụp ảnh màn hình gian lận vé.
                </Text>
              </View>
            </View>

            {/* Lower Pass Details (Boarding Info) */}
            <View style={styles.passDetailsSection}>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailTitle}>NGÀY ĐẤU</Text>
                  <Text style={styles.detailValue}>
                    {ticketData?.booking?.bookingDate?.split('T')[0] || activeBooking?.bookingDate?.split('T')[0] || 'Hôm nay'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailTitle}>KHUNG GIỜ</Text>
                  <Text style={[styles.detailValue, styles.detailHighlight]}>
                    {ticketData?.booking?.startTime || activeBooking?.startTime} - {ticketData?.booking?.endTime || activeBooking?.endTime}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailTitle}>THANH TOÁN</Text>
                  <Text style={[styles.detailValue, styles.detailPrice]}>
                    {(ticketData?.booking?.totalPrice || activeBooking?.totalPrice)?.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Manual Refresh Button */}
          <TouchableOpacity
            style={styles.manualRefreshBtn}
            onPress={fetchDynamicQr}
            activeOpacity={0.8}
          >
            <Text style={styles.manualRefreshText}>⚡ TẢI LẠI MÃ QR MỚI NGAY LẬP TỨC</Text>
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
    fontWeight: '800',
    color: colors.textPrimary,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  walletCardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  passHeader: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  passHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  brandBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00f2fe',
    letterSpacing: 0.5,
  },
  facilityName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  vipTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  vipTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f59e0b',
  },
  venueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  venueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  venueName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  passIdBox: {
    alignItems: 'flex-end',
  },
  passIdLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
  },
  passIdValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00f2fe',
    fontFamily: 'monospace',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  routeStop: {
    alignItems: 'center',
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#475569',
    marginBottom: 3,
  },
  routeDotActive: {
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  routeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
  perforatedSection: {
    height: 24,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  notchLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    position: 'absolute',
    left: -12,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  notchRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    position: 'absolute',
    right: -12,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tearDashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  qrSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  scanReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f2fe',
    marginRight: 6,
  },
  scanReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00f2fe',
    letterSpacing: 0.5,
  },
  checkedInBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  checkedInText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
  },
  checkedInSub: {
    fontSize: 9,
    color: '#10b981',
    marginTop: 1,
  },
  scannerWrapper: {
    width: 220,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 8,
  },
  cornerBracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#00f2fe',
    zIndex: 10,
  },
  cornerTopLeft: {
    top: -3,
    left: -3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: -3,
    right: -3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  qrImageContainer: {
    width: 204,
    height: 204,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  qrImage: {
    width: 204,
    height: 204,
  },
  laserBeamContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 20,
    justifyContent: 'center',
    zIndex: 5,
  },
  laserBeamGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: 'rgba(0, 242, 254, 0.3)',
  },
  laserBeamLine: {
    height: 2,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
  },
  watermarkStamp: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(6, 78, 59, 0.85)',
    transform: [{ rotate: '-14deg' }],
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#10b981',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  stampTextMain: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  stampTextSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a7f3d0',
    letterSpacing: 1,
  },
  countdownSection: {
    width: '100%',
    marginTop: 20,
  },
  countdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  countdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  countdownSeconds: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00f2fe',
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  securityHint: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  passDetailsSection: {
    backgroundColor: '#1e293b',
    padding: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 3,
  },
  detailHighlight: {
    color: '#00f2fe',
  },
  detailPrice: {
    color: '#10b981',
    fontFamily: 'monospace',
  },
  manualRefreshBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  manualRefreshText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00f2fe',
    letterSpacing: 0.5,
  },
});
