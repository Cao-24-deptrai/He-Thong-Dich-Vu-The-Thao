// mobile/App.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { colors } from './src/theme/colors';
import { useAuthStore } from './src/store/useAuthStore';
import { useBookingStore } from './src/store/useBookingStore';

// Screens
import { AuthScreen } from './src/screens/AuthScreen';
import { FacilityListScreen } from './src/screens/FacilityListScreen';
import { VenueSlotGridScreen } from './src/screens/VenueSlotGridScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { TicketScreen } from './src/screens/TicketScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { GymMembershipScreen } from './src/screens/GymMembershipScreen';
import { MatchmakingScreen } from './src/screens/MatchmakingScreen';
import { GamingScreen } from './src/screens/GamingScreen';
import { ContractsScreen } from './src/screens/ContractsScreen';
import { CoachesScreen } from './src/screens/CoachesScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { RatingsScreen } from './src/screens/RatingsScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { OfflineScreen } from './src/screens/OfflineScreen';
import { ProcessScreen } from './src/screens/ProcessScreen';
import { VouchersScreen } from './src/screens/VouchersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

type ScreenId =
  | 'HOME'
  | 'BOOKING_SLOTS'
  | 'PAYMENT'
  | 'TICKET'
  | 'GYM_POOL'
  | 'GAMING'
  | 'CONTRACTS'
  | 'COACHES'
  | 'MATCHMAKING'
  | 'WALLET'
  | 'RATINGS'
  | 'CHAT'
  | 'NOTIFICATIONS'
  | 'OFFLINE'
  | 'PROCESS'
  | 'VOUCHERS'
  | 'PROFILE'
  | 'HISTORY'
  | 'ONBOARDING'
  | 'AUTH';

export default function App() {
  const { user, token, logout } = useAuthStore();
  const { activeBooking, resetBooking } = useBookingStore();

  const [currentScreen, setCurrentScreen] = useState<ScreenId>('HOME');
  const [showScreenSelector, setShowScreenSelector] = useState<boolean>(false);
  const [ticketBookingId, setTicketBookingId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'PHONE_CHASSIS' | 'FULL_MOBILE'>('PHONE_CHASSIS');

  const windowWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  const isWebSimulator = isWeb && windowWidth > 460 && viewMode === 'PHONE_CHASSIS';

  // Screen catalog for the 20-screen suite (strictly without tournaments)
  const screensCatalog: { id: ScreenId; label: string; group: string }[] = [
    { id: 'HOME', label: '1. Trang Chủ Sân Bãi', group: 'Chính' },
    { id: 'BOOKING_SLOTS', label: '2. Đặt Sân Ma Trận 30p', group: 'Đặt Sân' },
    { id: 'PAYMENT', label: '3. Thanh Toán & VietQR', group: 'Đặt Sân' },
    { id: 'TICKET', label: '4. Vé QR Động 60s', group: 'Vé & Vào Sân' },
    { id: 'PROCESS', label: '5. Quy Trình 6 Bước', group: 'Vé & Vào Sân' },
    { id: 'OFFLINE', label: '6. Gói Vé Ngoại Tuyến', group: 'Vé & Vào Sân' },
    { id: 'GYM_POOL', label: '7. Gym Face ID & Bể Bơi', group: 'Tiện Ích' },
    { id: 'GAMING', label: '8. Cyber Gaming 100 PC', group: 'Tiện Ích' },
    { id: 'COACHES', label: '9. HLV & PT 1-1', group: 'Tiện Ích' },
    { id: 'CONTRACTS', label: '10. Hợp Đồng Thuê Cố Định', group: 'Tiện Ích' },
    { id: 'MATCHMAKING', label: '11. Cáp Kèo Giao Hữu', group: 'Tiện Ích' },
    { id: 'WALLET', label: '12. Ví Phanta Pay', group: 'Tài Chính' },
    { id: 'VOUCHERS', label: '13. Kho Voucher Ưu Đãi', group: 'Tài Chính' },
    { id: 'HISTORY', label: '14. Lịch Sử & Sổ Cái', group: 'Tài Chính' },
    { id: 'RATINGS', label: '15. Đánh Giá 4 Tiêu Chí', group: 'Cá Nhân' },
    { id: 'CHAT', label: '16. Trợ Lý CSKH 24/7', group: 'Cá Nhân' },
    { id: 'NOTIFICATIONS', label: '17. Trung Tâm Thông Báo', group: 'Cá Nhân' },
    { id: 'PROFILE', label: '18. Hồ Sơ & Thẻ Gold', group: 'Cá Nhân' },
    { id: 'ONBOARDING', label: '19. Onboarding Hướng Dẫn', group: 'Khởi Đầu' },
    { id: 'AUTH', label: '20. Đăng Nhập OTP SĐT', group: 'Khởi Đầu' },
  ];

  // Render current screen content
  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME':
        return <FacilityListScreen onSelectFacility={() => setCurrentScreen('BOOKING_SLOTS')} />;
      case 'BOOKING_SLOTS':
        return (
          <VenueSlotGridScreen
            onBack={() => setCurrentScreen('HOME')}
            onProceedPayment={() => setCurrentScreen('PAYMENT')}
          />
        );
      case 'PAYMENT':
        return (
          <PaymentScreen
            onBack={() => setCurrentScreen('BOOKING_SLOTS')}
            onPaymentSuccess={() => setCurrentScreen('TICKET')}
          />
        );
      case 'TICKET':
        return (
          <TicketScreen
            bookingId={ticketBookingId}
            onBack={() => {
              setTicketBookingId(undefined);
              setCurrentScreen('HOME');
            }}
          />
        );
      case 'GYM_POOL':
        return <GymMembershipScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'GAMING':
        return <GamingScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'CONTRACTS':
        return <ContractsScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'COACHES':
        return <CoachesScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'MATCHMAKING':
        return <MatchmakingScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'WALLET':
        return <WalletScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'RATINGS':
        return <RatingsScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'CHAT':
        return <ChatScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'NOTIFICATIONS':
        return <NotificationsScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'OFFLINE':
        return <OfflineScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'PROCESS':
        return <ProcessScreen onBack={() => setCurrentScreen('HOME')} />;
      case 'VOUCHERS':
        return (
          <VouchersScreen
            onBack={() => setCurrentScreen('HOME')}
            onSelectVoucher={() => {
              if (activeBooking) {
                setCurrentScreen('PAYMENT');
              } else {
                setCurrentScreen('HOME');
              }
            }}
          />
        );
      case 'PROFILE':
        return (
          <ProfileScreen
            onBack={() => setCurrentScreen('HOME')}
            onOpenWallet={() => setCurrentScreen('WALLET')}
            onOpenHistory={() => setCurrentScreen('HISTORY')}
            onOpenVouchers={() => setCurrentScreen('VOUCHERS')}
          />
        );
      case 'HISTORY':
        return (
          <HistoryScreen
            onViewTicket={(id) => {
              setTicketBookingId(id);
              setCurrentScreen('TICKET');
            }}
          />
        );
      case 'ONBOARDING':
        return <OnboardingScreen onFinish={() => setCurrentScreen('HOME')} />;
      case 'AUTH':
        return <AuthScreen />;
      default:
        return <FacilityListScreen onSelectFacility={() => setCurrentScreen('BOOKING_SLOTS')} />;
    }
  };

  // Main app body
  const appContent = (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Simulator Control Bar */}
      <View style={styles.topControlBar}>
        <TouchableOpacity
          style={styles.selectorBtn}
          onPress={() => setShowScreenSelector(!showScreenSelector)}
        >
          <Text style={styles.selectorBtnText}>
            📱 {screensCatalog.find((s) => s.id === currentScreen)?.label || 'Chọn Màn Hình'} ⌵
          </Text>
        </TouchableOpacity>

        <View style={styles.topRightControls}>
          {isWeb && (
            <TouchableOpacity
              style={styles.modeToggleBtn}
              onPress={() =>
                setViewMode(viewMode === 'PHONE_CHASSIS' ? 'FULL_MOBILE' : 'PHONE_CHASSIS')
              }
            >
              <Text style={styles.modeToggleText}>
                {viewMode === 'PHONE_CHASSIS' ? '📱 Full' : '💻 Khung'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.notifBadge}
            onPress={() => setCurrentScreen('NOTIFICATIONS')}
          >
            <Text style={styles.notifBadgeText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatBadge}
            onPress={() => setCurrentScreen('CHAT')}
          >
            <Text style={styles.chatBadgeText}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Selector Dropdown Drawer */}
      {showScreenSelector && (
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Hệ Thống Màn Hình Phanta Mobile</Text>
            <TouchableOpacity onPress={() => setShowScreenSelector(false)}>
              <Text style={styles.dropdownClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dropdownScroll}>
            {screensCatalog.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setCurrentScreen(s.id);
                  setShowScreenSelector(false);
                }}
                style={[
                  styles.dropdownItem,
                  currentScreen === s.id && styles.dropdownItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    currentScreen === s.id && styles.dropdownItemTextActive,
                  ]}
                >
                  {s.label}
                </Text>
                <Text style={styles.dropdownItemGroup}>{s.group}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Screen Viewport */}
      <View style={styles.viewport}>{renderScreen()}</View>

      {/* 5-Tab Bottom Dock Navigation */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[styles.dockTab, currentScreen === 'HOME' && styles.dockTabActive]}
          onPress={() => setCurrentScreen('HOME')}
        >
          <Text style={[styles.dockIcon, currentScreen === 'HOME' && styles.dockIconActive]}>🏠</Text>
          <Text style={[styles.dockLabel, currentScreen === 'HOME' && styles.dockLabelActive]}>Trang Chủ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dockTab, currentScreen === 'BOOKING_SLOTS' && styles.dockTabActive]}
          onPress={() => setCurrentScreen('BOOKING_SLOTS')}
        >
          <Text style={[styles.dockIcon, currentScreen === 'BOOKING_SLOTS' && styles.dockIconActive]}>⚽</Text>
          <Text style={[styles.dockLabel, currentScreen === 'BOOKING_SLOTS' && styles.dockLabelActive]}>Đặt Sân</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dockTab, currentScreen === 'TICKET' && styles.dockTabActive]}
          onPress={() => setCurrentScreen('TICKET')}
        >
          <Text style={[styles.dockIcon, currentScreen === 'TICKET' && styles.dockIconActive]}>🎟️</Text>
          <Text style={[styles.dockLabel, currentScreen === 'TICKET' && styles.dockLabelActive]}>Vé Vào Sân</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dockTab,
            ['GYM_POOL', 'GAMING', 'COACHES', 'CONTRACTS', 'MATCHMAKING'].includes(currentScreen) &&
              styles.dockTabActive,
          ]}
          onPress={() => setCurrentScreen('CONTRACTS')}
        >
          <Text
            style={[
              styles.dockIcon,
              ['GYM_POOL', 'GAMING', 'COACHES', 'CONTRACTS', 'MATCHMAKING'].includes(currentScreen) &&
                styles.dockIconActive,
            ]}
          >
            📋
          </Text>
          <Text
            style={[
              styles.dockLabel,
              ['GYM_POOL', 'GAMING', 'COACHES', 'CONTRACTS', 'MATCHMAKING'].includes(currentScreen) &&
                styles.dockLabelActive,
            ]}
          >
            Hợp Đồng
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.dockTab,
            ['PROFILE', 'WALLET', 'HISTORY', 'VOUCHERS'].includes(currentScreen) && styles.dockTabActive,
          ]}
          onPress={() => setCurrentScreen('PROFILE')}
        >
          <Text
            style={[
              styles.dockIcon,
              ['PROFILE', 'WALLET', 'HISTORY', 'VOUCHERS'].includes(currentScreen) && styles.dockIconActive,
            ]}
          >
            👤
          </Text>
          <Text
            style={[
              styles.dockLabel,
              ['PROFILE', 'WALLET', 'HISTORY', 'VOUCHERS'].includes(currentScreen) && styles.dockLabelActive,
            ]}
          >
            Cá Nhân
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // If on web desktop and phone chassis mode is active, wrap in iPhone 15 Pro simulator chassis
  if (isWebSimulator) {
    return (
      <View style={styles.webContainer}>
        {/* Simulator Frame Header */}
        <View style={styles.simulatorBanner}>
          <Text style={styles.simulatorTitle}>PHANTA SPORTS MOBILE SIMULATOR</Text>
          <Text style={styles.simulatorSub}>
            Mô phỏng iPhone 15 Pro • Nhấn '📱 Full' để chuyển toàn màn hình
          </Text>
        </View>

        {/* iPhone Chassis */}
        <View style={styles.phoneChassis}>
          {/* Dynamic Island */}
          <View style={styles.dynamicIsland}>
            <View style={styles.cameraHole} />
            <View style={styles.sensorHole} />
          </View>
          {appContent}
        </View>
      </View>
    );
  }

  // Pure Fullscreen Mobile App (No Desktop Wrapper)
  return appContent;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, width: '100%', height: '100%' },
  viewport: { flex: 1 },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0C0F0C',
    borderBottomWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.22)',
    zIndex: 10,
  },
  selectorBtn: {
    backgroundColor: '#191C14',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.3)',
    maxWidth: '55%',
  },
  selectorBtnText: { color: '#9CFF93', fontWeight: '800', fontSize: 11 },
  topRightControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeToggleBtn: {
    backgroundColor: '#22261E',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeToggleText: { fontSize: 10, fontWeight: '800', color: '#9CFF93' },
  notifBadge: { backgroundColor: '#191C14', padding: 5, borderRadius: 6 },
  notifBadgeText: { fontSize: 12 },
  chatBadge: { backgroundColor: '#191C14', padding: 5, borderRadius: 6 },
  chatBadgeText: { fontSize: 12 },
  dropdownModal: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 12,
    backgroundColor: '#121512',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9CFF93',
    padding: 12,
    maxHeight: 420,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dropdownTitle: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  dropdownClose: { fontSize: 16, color: '#A1A79F', padding: 4 },
  dropdownScroll: { maxHeight: 350 },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemActive: { backgroundColor: 'rgba(156, 255, 147, 0.18)' },
  dropdownItemText: { fontSize: 12, fontWeight: '700', color: '#cbd5e1' },
  dropdownItemTextActive: { color: '#9CFF93', fontWeight: '900' },
  dropdownItemGroup: { fontSize: 10, color: '#A1A79F' },
  bottomDock: {
    flexDirection: 'row',
    backgroundColor: '#0C0F0C',
    borderTopWidth: 1,
    borderColor: 'rgba(156, 255, 147, 0.22)',
    paddingVertical: 8,
    paddingBottom: 12,
  },
  dockTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dockTabActive: {},
  dockIcon: { fontSize: 17, color: '#64748b' },
  dockIconActive: { color: '#9CFF93' },
  dockLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 3 },
  dockLabelActive: { color: '#9CFF93' },
  webContainer: {
    flex: 1,
    backgroundColor: '#060D0A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  simulatorBanner: { alignItems: 'center', marginBottom: 12 },
  simulatorTitle: { fontSize: 14, fontWeight: '900', color: '#9CFF93', letterSpacing: 1 },
  simulatorSub: { fontSize: 11, color: '#A1A79F', marginTop: 2 },
  phoneChassis: {
    width: 395,
    height: 844,
    backgroundColor: '#0C0F0C',
    borderRadius: 48,
    borderWidth: 8,
    borderColor: '#191C14',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  dynamicIsland: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 110,
    height: 30,
    backgroundColor: '#000',
    borderRadius: 20,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraHole: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#111827' },
  sensorHole: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0f172a' },
});
