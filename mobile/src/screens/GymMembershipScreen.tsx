// mobile/src/screens/GymMembershipScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import QRCode from 'qrcode';
import { colors } from '../theme/colors';
import { api } from '../api/client';

const { width } = Dimensions.get('window');

interface GymMembershipScreenProps {
  onBack?: () => void;
}

type TabType = 'GYM' | 'POOL';

export const GymMembershipScreen: React.FC<GymMembershipScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('GYM');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- DỮ LIỆU THẺ GYM & MÃ QR ĐỊNH DANH (BR-26, BR-27, BR-28, BR-29, BR-30a, AC-70) ---
  const [myGymQr, setMyGymQr] = useState<{
    hasCredential: boolean;
    qrCode?: string;
    status?: 'ACTIVE' | 'EXPIRED';
    planType?: string;
    planName?: string;
    startDate?: string;
    endDate?: string;
    daysRemaining?: number;
    message?: string;
  } | null>(null);
  const [gymQrDataUrl, setGymQrDataUrl] = useState<string | null>(null);

  const [gymCapacity, setGymCapacity] = useState<{
    insideCount: number;
    maxCapacity: number;
    isFull: boolean;
    occupancyPercentage: number;
    availableSpots: number;
  }>({
    insideCount: 0,
    maxCapacity: 100,
    isFull: false,
    occupancyPercentage: 0,
    availableSpots: 100,
  });

  const [gymPlans, setGymPlans] = useState<any[]>([]);
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<any | null>(null);
  const [upgradeCalculation, setUpgradeCalculation] = useState<any | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // --- DỮ LIỆU VÉ BƠI THEO LƯỢT (BR-31, AC-87) ---
  const [poolStatus, setPoolStatus] = useState<any>({
    pools: {
      POOL_50M: { name: 'Hồ Olympic 50m', maxCapacity: 80, currentOccupancy: 0, status: 'OPEN' },
      POOL_25M: { name: 'Hồ Khởi Động 25m', maxCapacity: 40, currentOccupancy: 0, status: 'OPEN' },
    },
    prices: {
      ADULT: 25000,
      CHILD: 20000,
    },
  });

  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [myPoolTickets, setMyPoolTickets] = useState<any[]>([]);
  const [buyingPoolTickets, setBuyingPoolTickets] = useState(false);

  // Modal xem mã QR vé bơi lớn
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<any | null>(null);
  const [ticketQrDataUrl, setTicketQrDataUrl] = useState<string | null>(null);

  // Tải dữ liệu toàn bộ màn hình
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [qrRes, capRes, plansRes, poolRes, ticketsRes] = await Promise.allSettled([
        api.getMyGymQr(),
        api.getGymCapacity(),
        api.getGymPlans(),
        api.getPoolStatus(),
        api.getMyPoolTickets(),
      ]);

      if (qrRes.status === 'fulfilled' && qrRes.value) {
        setMyGymQr(qrRes.value);
        if (qrRes.value.qrCode) {
          generateGymQrImage(qrRes.value.qrCode);
        }
      }

      if (capRes.status === 'fulfilled' && capRes.value) {
        setGymCapacity(capRes.value);
      }

      if (plansRes.status === 'fulfilled' && plansRes.value) {
        setGymPlans(plansRes.value);
      }

      if (poolRes.status === 'fulfilled' && poolRes.value) {
        setPoolStatus(poolRes.value);
      }

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        setMyPoolTickets(ticketsRes.value || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Gym & Pool:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Tạo ảnh QR cho thẻ Gym định danh
  const generateGymQrImage = async (code: string) => {
    try {
      const url = await QRCode.toDataURL(code, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setGymQrDataUrl(url);
    } catch (err) {
      console.error('Lỗi tạo ảnh QR Gym:', err);
    }
  };

  // Mở mã QR vé bơi trong Modal
  const openTicketQrModal = async (ticket: any) => {
    setSelectedTicketForQr(ticket);
    try {
      const url = await QRCode.toDataURL(ticket.ticketCode, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setTicketQrDataUrl(url);
    } catch (err) {
      console.error('Lỗi tạo ảnh QR vé bơi:', err);
    }
  };

  // Chọn gói tập để mua hoặc gia hạn / nâng cấp
  const handleSelectPlan = async (plan: any) => {
    setSelectedPlanForPurchase(plan);
    setUpgradeCalculation(null);

    // Nếu hội viên đang có gói và còn hạn -> Gọi tính toán nâng cấp khấu trừ (BR-28)
    if (myGymQr?.hasCredential && myGymQr.status === 'ACTIVE' && (myGymQr.daysRemaining ?? 0) > 0) {
      try {
        const upgradeInfo = await api.calculateGymUpgrade(plan.type);
        setUpgradeCalculation(upgradeInfo);
      } catch (err) {
        console.log('Không thể tính khấu trừ nâng cấp:', err);
      }
    }

    setIsPurchaseModalOpen(true);
  };

  // Xác nhận mua / gia hạn gói tập Gym
  const handleConfirmGymPurchase = async () => {
    if (!selectedPlanForPurchase) return;

    setPurchasing(true);
    try {
      const res = await api.purchaseOrRenewGymPlan({
        planType: selectedPlanForPurchase.type,
        paymentMethod: 'VIETQR',
      });

      Alert.alert(
        'Đăng Ký Thành Công!',
        res.message ||
          'Bạn đã đăng ký gói tập thành công. Mã QR định danh của bạn đã sẵn sàng để quét mở cửa xoay!',
        [{ text: 'Đồng ý', onPress: () => loadData(true) }]
      );
      setIsPurchaseModalOpen(false);
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Không thể thanh toán gói tập');
    } finally {
      setPurchasing(false);
    }
  };

  // Mua vé bơi theo lượt trong ngày (BR-31)
  const handlePurchasePoolTickets = async () => {
    if (adultCount <= 0 && childCount <= 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 vé bơi!');
      return;
    }

    setBuyingPoolTickets(true);
    try {
      const res = await api.purchasePoolTickets({
        adultCount,
        childCount,
      });

      Alert.alert(
        'Mua Vé Bơi Thành Công!',
        `Đã tạo ${res.tickets?.length || adultCount + childCount} vé bơi. Vé có giá trị trong ngày hôm nay (đến 23:59:59). Bạn có thể quét vào một trong hai hồ bơi bất kỳ!`,
        [
          {
            text: 'Xem Vé Ngay',
            onPress: () => {
              loadData(true);
              if (res.tickets && res.tickets.length > 0) {
                openTicketQrModal(res.tickets[0]);
              }
            },
          },
        ]
      );
      setAdultCount(1);
      setChildCount(0);
    } catch (err: any) {
      Alert.alert('Lỗi mua vé bơi', err.message || 'Không thể hoàn tất mua vé bơi');
    } finally {
      setBuyingPoolTickets(false);
    }
  };

  const poolTotalPrice = adultCount * 25000 + childCount * 20000;

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang đồng bộ thẻ tập & vé bơi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Điều Hướng */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gym & Hồ Bơi Phanta</Text>
          <Text style={styles.headerSubtitle}>
            Cửa xoay mã QR tự động & Vé bơi theo lượt (Epic E11)
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshIconBtn}>
          <Text style={styles.refreshIconText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar: Gym vs Pool */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'GYM' && styles.tabButtonActive]}
          onPress={() => setActiveTab('GYM')}
        >
          <Text style={[styles.tabText, activeTab === 'GYM' && styles.tabTextActive]}>
            Thẻ Tập Gym ({gymCapacity.insideCount}/100)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'POOL' && styles.tabButtonActivePool]}
          onPress={() => setActiveTab('POOL')}
        >
          <Text style={[styles.tabText, activeTab === 'POOL' && styles.tabTextActivePool]}>
            Vé Bơi Theo Lượt (2 Hồ)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ======================================================== */}
        {/* TAB 1: PHÒNG GYM (THẺ ĐIỆN TỬ, MÃ QR & 4 GÓI TẬP BR-27) */}
        {/* ======================================================== */}
        {activeTab === 'GYM' && (
          <View style={{ gap: 20 }}>
            {/* Thẻ Hội Viên Điện Tử (Digital Membership Card) */}
            <View style={styles.membershipCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardBrand}>PHANTA FITNESS CLUB</Text>
                  <Text style={styles.cardPlanName}>
                    {myGymQr?.hasCredential && myGymQr.planName
                      ? myGymQr.planName
                      : 'CHƯA CÓ GÓI TẬP HOẠT ĐỘNG'}
                  </Text>
                </View>

                {myGymQr?.hasCredential ? (
                  <View
                    style={[
                      styles.statusPill,
                      myGymQr.status === 'ACTIVE' ? styles.statusActive : styles.statusExpired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        myGymQr.status === 'ACTIVE'
                          ? styles.statusActiveText
                          : styles.statusExpiredText,
                      ]}
                    >
                      {myGymQr.status === 'ACTIVE' ? '● ĐANG HOẠT ĐỘNG' : '● HẾT HẠN (EXPIRED)'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, styles.statusNew]}>
                    <Text style={[styles.statusPillText, styles.statusNewText]}>KHÁCH MỚI</Text>
                  </View>
                )}
              </View>

              {/* Thông tin hạn dùng */}
              {myGymQr?.hasCredential && (
                <View style={styles.expiryRow}>
                  <View>
                    <Text style={styles.metaLabel}>Hạn sử dụng</Text>
                    <Text style={styles.metaValue}>
                      {myGymQr.endDate
                        ? new Date(myGymQr.endDate).toLocaleDateString('vi-VN')
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaLabel}>Thời gian còn lại</Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: (myGymQr.daysRemaining ?? 0) <= 3 ? colors.danger : colors.volt },
                      ]}
                    >
                      {myGymQr.daysRemaining ?? 0} ngày
                    </Text>
                  </View>
                </View>
              )}

              {/* Khối Mã QR Định Danh Cố Định (BR-26, BR-30a) */}
              {myGymQr?.hasCredential && myGymQr.qrCode ? (
                <View style={styles.qrSection}>
                  <View style={styles.qrFrame}>
                    {gymQrDataUrl ? (
                      <Image source={{ uri: gymQrDataUrl }} style={styles.qrImage} />
                    ) : (
                      <ActivityIndicator size="small" color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.qrCodeString}>{myGymQr.qrCode}</Text>
                  <Text style={styles.qrInstruction}>
                    Đưa mã này vào mắt đọc cửa xoay tự động để VÀO / RA phòng tập. Khóa chống quét trùng 5 phút (BR-30).
                  </Text>
                </View>
              ) : (
                <View style={styles.noCardContainer}>
                  <Text style={styles.noCardTitle}>Chưa Kích Hoạt Mã QR Cửa Xoay</Text>
                  <Text style={styles.noCardDesc}>
                    Vui lòng chọn mua 1 trong các gói tập bên dưới để hệ thống cấp mã QR định danh duy nhất (BR-26).
                  </Text>
                </View>
              )}
            </View>

            {/* Thanh đo Sức chứa phòng Gym hiện tại (BR-29, AC-31) */}
            <View style={styles.capacityCard}>
              <View style={styles.capacityHeader}>
                <Text style={styles.capacityTitle}>Sức Chứa Phòng Gym Thời Gian Thực</Text>
                <Text style={styles.capacityCount}>
                  <Text style={{ color: colors.volt, fontWeight: '900' }}>
                    {gymCapacity.insideCount}
                  </Text>
                  /100 người
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, (gymCapacity.insideCount / 100) * 100)}%`,
                      backgroundColor:
                        gymCapacity.isFull || gymCapacity.insideCount >= 100
                          ? colors.danger
                          : gymCapacity.insideCount > 75
                          ? colors.warning
                          : colors.volt,
                    },
                  ]}
                />
              </View>

              <Text style={styles.capacityNote}>
                {gymCapacity.isFull
                  ? 'CẢNH BÁO: Phòng Gym đã đủ 100 người (AC-31). Cửa xoay đang tạm khóa chiều vào cho đến khi có khách rời phòng.'
                  : `Hiện còn ${gymCapacity.availableSpots} chỗ trống. Không gian rất thoải mái cho buổi tập của bạn.`}
              </Text>
            </View>

            {/* Danh Sách 4 Gói Tập Chuẩn BR-27 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Các Gói Tập Chuẩn (BR-27)</Text>
              <Text style={styles.sectionSubtitle}>
                Không có gói năm. Gia hạn cộng dồn, nâng cấp trừ tiền ngày chưa dùng (BR-28).
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {[
                {
                  type: 'DAY_1',
                  name: 'Vé Tập Lẻ 1 Ngày',
                  price: 50000,
                  duration: '1 ngày',
                  desc: 'Trải nghiệm toàn bộ tiện ích & máy tập trong ngày',
                  badge: 'Khách vãng lai',
                },
                {
                  type: 'MONTH_1',
                  name: 'Gói Hội Viên 1 Tháng',
                  price: 500000,
                  duration: '30 ngày',
                  desc: 'Không giới hạn số lượt vào/ra, kèm tủ đồ & nước uống',
                  badge: 'Phổ biến nhất',
                  isHot: true,
                },
                {
                  type: 'MONTH_3',
                  name: 'Gói Hội Viên 3 Tháng',
                  price: 1350000,
                  duration: '90 ngày',
                  desc: 'Tiết kiệm 150.000 đ so với mua lẻ từng tháng',
                  badge: 'Tiết kiệm 10%',
                },
                {
                  type: 'MONTH_6',
                  name: 'Gói Hội Viên 6 Tháng',
                  price: 2400000,
                  duration: '180 ngày',
                  desc: 'Tiết kiệm 600.000 đ. Cam kết duy trì vóc dáng',
                  badge: 'Ưu đãi cao nhất',
                },
              ].map((plan) => (
                <View
                  key={plan.type}
                  style={[styles.planCard, plan.isHot && styles.planCardHot]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.planDesc}>{plan.desc}</Text>
                    <Text style={styles.planPrice}>
                      {plan.price.toLocaleString('vi-VN')} đ{' '}
                      <Text style={styles.planDuration}>/ {plan.duration}</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.planBuyBtn, plan.isHot && styles.planBuyBtnHot]}
                    onPress={() => handleSelectPlan(plan)}
                  >
                    <Text style={styles.planBuyBtnText}>
                      {myGymQr?.hasCredential && myGymQr.status === 'ACTIVE'
                        ? 'Gia Hạn / Nâng Cấp'
                        : 'Đăng Ký'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: VÉ BƠI THEO LƯỢT (BR-31, AC-87)                   */}
        {/* ======================================================== */}
        {activeTab === 'POOL' && (
          <View style={{ gap: 20 }}>
            {/* Trạng Thái 2 Hồ Bơi */}
            <View style={styles.poolStatusGrid}>
              {/* Hồ Olympic 50m */}
              <View style={styles.poolCard}>
                <View style={styles.poolCardHeader}>
                  <Text style={styles.poolName}>Hồ Olympic 50m</Text>
                  <View
                    style={[
                      styles.poolStatusPill,
                      poolStatus.pools?.POOL_50M?.status === 'OPEN'
                        ? styles.poolStatusOpen
                        : styles.poolStatusClosed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.poolStatusText,
                        poolStatus.pools?.POOL_50M?.status === 'OPEN'
                          ? styles.poolStatusTextOpen
                          : styles.poolStatusTextClosed,
                      ]}
                    >
                      {poolStatus.pools?.POOL_50M?.status === 'OPEN' ? 'MỞ CỬA' : 'ĐÓNG ĐỘT XUẤT'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.poolOccupancy}>
                  {poolStatus.pools?.POOL_50M?.currentOccupancy || 0}
                  <Text style={styles.poolMaxCapacity}> / 80 người</Text>
                </Text>
                <Text style={styles.poolSubtext}>Dành cho khách bơi cự ly dài & rèn luyện thể lực</Text>
              </View>

              {/* Hồ Khởi Động 25m */}
              <View style={styles.poolCard}>
                <View style={styles.poolCardHeader}>
                  <Text style={styles.poolName}>Hồ Khởi Động 25m</Text>
                  <View
                    style={[
                      styles.poolStatusPill,
                      poolStatus.pools?.POOL_25M?.status === 'OPEN'
                        ? styles.poolStatusOpen
                        : styles.poolStatusClosed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.poolStatusText,
                        poolStatus.pools?.POOL_25M?.status === 'OPEN'
                          ? styles.poolStatusTextOpen
                          : styles.poolStatusTextClosed,
                      ]}
                    >
                      {poolStatus.pools?.POOL_25M?.status === 'OPEN' ? 'MỞ CỬA' : 'ĐÓNG ĐỘT XUẤT'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.poolOccupancy}>
                  {poolStatus.pools?.POOL_25M?.currentOccupancy || 0}
                  <Text style={styles.poolMaxCapacity}> / 40 người</Text>
                </Text>
                <Text style={styles.poolSubtext}>Dành cho trẻ em, học bơi & bơi khởi động</Text>
              </View>
            </View>

            {/* Quầy Mua Vé Bơi Theo Lượt (BR-31) */}
            <View style={styles.buyPoolCard}>
              <Text style={styles.buyPoolTitle}>Mua Vé Bơi Theo Lượt (BR-31)</Text>
              <Text style={styles.buyPoolDesc}>
                Vé có giá trị trong ngày mua (đến 23:59:59). Dùng chung linh hoạt cho cả 2 hồ bơi.
              </Text>

              {/* Vé người lớn */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterName}>Vé Người Lớn (từ 1m4)</Text>
                  <Text style={styles.counterPrice}>25.000 đ / vé</Text>
                </View>
                <View style={styles.counterActions}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setAdultCount(Math.max(0, adultCount - 1))}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{adultCount}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setAdultCount(adultCount + 1)}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Vé trẻ em */}
              <View style={styles.counterRow}>
                <View>
                  <Text style={styles.counterName}>Vé Trẻ Em (&lt; 1m4)</Text>
                  <Text style={styles.counterPrice}>20.000 đ / vé</Text>
                </View>
                <View style={styles.counterActions}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setChildCount(Math.max(0, childCount - 1))}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{childCount}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setChildCount(childCount + 1)}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tổng tiền & Nút Mua */}
              <View style={styles.poolTotalRow}>
                <View>
                  <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
                  <Text style={styles.totalValue}>{poolTotalPrice.toLocaleString('vi-VN')} đ</Text>
                  <Text style={styles.vatNote}>(Chưa bao gồm VAT theo BR-31)</Text>
                </View>

                <TouchableOpacity
                  style={[styles.buyPoolSubmitBtn, (adultCount + childCount === 0 || buyingPoolTickets) && { opacity: 0.5 }]}
                  disabled={adultCount + childCount === 0 || buyingPoolTickets}
                  onPress={handlePurchasePoolTickets}
                >
                  <Text style={styles.buyPoolSubmitBtnText}>
                    {buyingPoolTickets ? 'Đang tạo vé...' : 'Mua Vé Ngay'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Danh Sách Vé Bơi Của Tôi Trong Ngày */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Vé Bơi Trong Ngày Của Tôi ({myPoolTickets.length})</Text>
              <Text style={styles.sectionSubtitle}>
                Chạm vào vé để mở mã QR quét tại cổng vào hồ bơi
              </Text>
            </View>

            {myPoolTickets.length === 0 ? (
              <View style={styles.emptyTicketsCard}>
                <Text style={styles.emptyTicketsTitle}>Bạn chưa có vé bơi nào trong ngày</Text>
                <Text style={styles.emptyTicketsDesc}>
                  Hãy chọn số lượng vé ở trên và nhấn "Mua Vé Ngay" để nhận mã QR vào hồ bơi.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {myPoolTickets.map((t) => (
                  <TouchableOpacity
                    key={t._id}
                    style={styles.ticketItem}
                    onPress={() => openTicketQrModal(t)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.ticketTypeCode}>
                          {t.ticketType === 'ADULT' ? 'VÉ NGƯỜI LỚN' : 'VÉ TRẺ EM'}
                        </Text>
                        <Text style={styles.ticketCodeSnippet}>{t.ticketCode}</Text>
                      </View>
                      <Text style={styles.ticketPrice}>
                        {t.price?.toLocaleString('vi-VN')} đ | Hạn: {new Date(t.validDate).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View
                        style={[
                          styles.ticketStatusBadge,
                          t.status === 'UNUSED'
                            ? styles.ticketStatusUnused
                            : t.status === 'USED'
                            ? styles.ticketStatusUsed
                            : styles.ticketStatusRefunded,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ticketStatusText,
                            t.status === 'UNUSED'
                              ? styles.ticketStatusTextUnused
                              : t.status === 'USED'
                              ? styles.ticketStatusTextUsed
                              : styles.ticketStatusTextRefunded,
                          ]}
                        >
                          {t.status === 'UNUSED'
                            ? 'CHƯA DÙNG (MỞ QR)'
                            : t.status === 'USED'
                            ? 'ĐÃ SỬ DỤNG'
                            : 'ĐÃ HOÀN TIỀN (AC-87)'}
                        </Text>
                      </View>
                      {t.status === 'UNUSED' && (
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                          Quét vào cổng →
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL: XÁC NHẬN MUA / GIA HẠN / NÂNG CẤP GÓI GYM        */}
      {/* ======================================================== */}
      <Modal visible={isPurchaseModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác Nhận Đăng Ký Gói Tập</Text>

            {selectedPlanForPurchase && (
              <View style={styles.modalPlanSummary}>
                <Text style={styles.modalPlanName}>{selectedPlanForPurchase.name}</Text>
                <Text style={styles.modalPlanDesc}>{selectedPlanForPurchase.desc}</Text>
                <Text style={styles.modalPlanDuration}>Thời hạn: {selectedPlanForPurchase.duration}</Text>
              </View>
            )}

            {/* Chi tiết khấu trừ nâng cấp gói (BR-28) */}
            {upgradeCalculation && upgradeCalculation.canUpgrade && upgradeCalculation.creditAmount > 0 && (
              <View style={styles.upgradeBox}>
                <Text style={styles.upgradeBoxTitle}>ƯU ĐÃI NÂNG CẤP GÓI (BR-28)</Text>
                <Text style={styles.upgradeBoxText}>
                  Khấu trừ {upgradeCalculation.daysRemaining} ngày chưa dùng của gói cũ:
                </Text>
                <Text style={styles.upgradeCreditAmount}>
                  - {upgradeCalculation.creditAmount.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}

            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPriceLabel}>Số tiền cần thanh toán:</Text>
              <Text style={styles.modalPriceValue}>
                {(upgradeCalculation?.finalAmount ?? selectedPlanForPurchase?.price ?? 0).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsPurchaseModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                disabled={purchasing}
                onPress={handleConfirmGymPurchase}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {purchasing ? 'Đang xử lý...' : 'Xác Nhận & Cấp QR'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: HIỂN THỊ MÃ QR VÉ BƠI LỚN ĐỂ QUÉT CỔNG HỒ BƠI     */}
      {/* ======================================================== */}
      <Modal visible={!!selectedTicketForQr} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCenter}>
            <Text style={styles.ticketModalTitle}>MÃ VÉ BƠI VÀO CỔNG</Text>
            <Text style={styles.ticketModalSubtitle}>
              Đưa mã QR này vào đầu đọc tại Cổng Hồ 50m hoặc Hồ 25m
            </Text>

            <View style={styles.ticketQrWrapper}>
              {ticketQrDataUrl ? (
                <Image source={{ uri: ticketQrDataUrl }} style={styles.ticketQrImage} />
              ) : (
                <ActivityIndicator size="large" color={colors.primary} />
              )}
            </View>

            <Text style={styles.ticketModalCode}>{selectedTicketForQr?.ticketCode}</Text>
            <Text style={styles.ticketModalInfo}>
              Loại vé: {selectedTicketForQr?.ticketType === 'ADULT' ? 'Người lớn (25k)' : 'Trẻ em (20k)'}
            </Text>
            <Text style={styles.ticketModalExpiry}>
              Hạn dùng đến: 23:59:59 hôm nay (BR-31)
            </Text>

            <TouchableOpacity
              style={styles.ticketCloseBtn}
              onPress={() => setSelectedTicketForQr(null)}
            >
              <Text style={styles.ticketCloseBtnText}>Đóng Màn Hình</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshIconText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.volt,
  },
  tabButtonActivePool: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.volt,
  },
  tabTextActivePool: {
    color: colors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  membershipCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    // shadow removed
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.volt,
    letterSpacing: 1.5,
  },
  cardPlanName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusActiveText: {
    color: colors.volt,
    fontSize: 10,
    fontWeight: '800',
  },
  statusExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusExpiredText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  statusNew: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
  },
  statusNewText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  qrFrame: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    // shadow removed
    elevation: 4,
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  qrCodeString: {
    fontSize: 11,
    // sans font
    color: colors.textSecondary,
    marginTop: 8,
  },
  qrInstruction: {
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  noCardContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  noCardDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  capacityCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  capacityCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityNote: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planCardHot: {
    borderColor: colors.volt,
    backgroundColor: '#0d1d1a',
  },
  planName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.volt,
  },
  planDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.volt,
    marginTop: 4,
  },
  planDuration: {
    fontSize: 11,
    fontWeight: 'normal',
    color: colors.textMuted,
  },
  planBuyBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planBuyBtnHot: {
    backgroundColor: colors.volt,
    borderColor: colors.volt,
  },
  planBuyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  // POOL STYLES
  poolStatusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  poolCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  poolName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  poolStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  poolStatusOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  poolStatusClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  poolStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  poolStatusTextOpen: {
    color: colors.volt,
  },
  poolStatusTextClosed: {
    color: colors.danger,
  },
  poolOccupancy: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  poolMaxCapacity: {
    fontSize: 11,
    fontWeight: 'normal',
    color: colors.textMuted,
  },
  poolSubtext: {
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 4,
  },
  buyPoolCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyPoolTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  buyPoolDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  counterName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  counterPrice: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 1,
  },
  counterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  counterValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: 16,
    textAlign: 'center',
  },
  poolTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  vatNote: {
    fontSize: 9,
    color: colors.textMuted,
  },
  buyPoolSubmitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buyPoolSubmitBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  emptyTicketsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTicketsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyTicketsDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  ticketItem: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTypeCode: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  ticketCodeSnippet: {
    fontSize: 10,
    // sans font
    color: colors.textMuted,
  },
  ticketPrice: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ticketStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketStatusUnused: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
  },
  ticketStatusUsed: {
    backgroundColor: colors.surfaceLight,
  },
  ticketStatusRefunded: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  ticketStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  ticketStatusTextUnused: {
    color: colors.primary,
  },
  ticketStatusTextUsed: {
    color: colors.textMuted,
  },
  ticketStatusTextRefunded: {
    color: colors.danger,
  },
  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalContentCenter: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalPlanSummary: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalPlanName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.volt,
  },
  modalPlanDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalPlanDuration: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  upgradeBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  upgradeBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  upgradeBoxText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeCreditAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.warning,
    marginTop: 2,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalPriceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.volt,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.volt,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  // TICKET QR MODAL
  ticketModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  ticketModalSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  ticketQrWrapper: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    // shadow removed
    elevation: 6,
  },
  ticketQrImage: {
    width: 200,
    height: 200,
  },
  ticketModalCode: {
    fontSize: 12,
    // sans font
    color: colors.textPrimary,
    marginTop: 12,
    fontWeight: '700',
  },
  ticketModalInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ticketModalExpiry: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  ticketCloseBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
