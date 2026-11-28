import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useFonts } from 'expo-font';
import {
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
} from '@expo-google-fonts/lexend';
import {
  Home,
  Calendar,
  LayoutGrid,
  FileText,
  User,
} from 'lucide-react-native';

import { fonts, spacing, useTheme } from './src/theme/colors';
import { useThemeStore } from './src/store/useThemeStore';
import { useBookingStore } from './src/store/useBookingStore';
import { useAuthStore } from './src/store/useAuthStore';
import {
  ServicesDropupMenu,
  ServiceScreenTarget,
} from './src/components/ServicesDropupMenu';

// Screens
import { AuthScreen } from './src/screens/AuthScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
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

export type ScreenId =
  | 'HOME'
  | 'BOOKING_SLOTS'
  | 'PAYMENT'
  | 'VOUCHERS'
  | 'TICKET'
  | 'GYM_POOL'
  | 'GAMING'
  | 'PROCESS'
  | 'CONTRACTS'
  | 'COACHES'
  | 'MATCHMAKING'
  | 'WALLET'
  | 'HISTORY'
  | 'RATINGS'
  | 'CHAT'
  | 'PROFILE'
  | 'NOTIFICATIONS'
  | 'OFFLINE'
  | 'SPLASH'
  | 'WELCOME'
  | 'ONBOARDING'
  | 'AUTH';

const HIDE_DOCK_SCREENS: ScreenId[] = ['SPLASH', 'WELCOME', 'ONBOARDING', 'AUTH'];

export default function App() {
  const theme = useTheme();
  const { mode: themeMode, pendingMode, commitThemeTransition } = useThemeStore();
  const { activeBooking } = useBookingStore();
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const themeFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (!pendingMode) return;
    const useNative = Platform.OS !== 'web';
    Animated.timing(themeFade, {
      toValue: 0.1,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: useNative,
    }).start(() => {
      commitThemeTransition();
      Animated.timing(themeFade, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: useNative,
      }).start();
    });
  }, [pendingMode, commitThemeTransition, themeFade]);

  const [fontsLoaded, fontsError] = useFonts({
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenId>('WELCOME');
  const [showServicesMenu, setShowServicesMenu] = useState<boolean>(false);
  const [ticketBookingId, setTicketBookingId] = useState<string | undefined>(undefined);

  const hideBottomDock = HIDE_DOCK_SCREENS.includes(currentScreen);

  const navigateTo = (screen: ScreenId) => {
    setShowServicesMenu(false);
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME':
        return (
          <FacilityListScreen
            onSelectFacility={() => navigateTo('BOOKING_SLOTS')}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );
      case 'BOOKING_SLOTS':
        return (
          <VenueSlotGridScreen
            onBack={() => navigateTo('HOME')}
            onProceedPayment={() => navigateTo('PAYMENT')}
            onOpenVouchers={() => navigateTo('VOUCHERS')}
          />
        );
      case 'PAYMENT':
        return (
          <PaymentScreen
            onBack={() => navigateTo('BOOKING_SLOTS')}
            onPaymentSuccess={() => navigateTo('TICKET')}
          />
        );
      case 'VOUCHERS':
        return (
          <VouchersScreen
            onBack={() => navigateTo(activeBooking ? 'BOOKING_SLOTS' : 'HOME')}
            onSelectVoucher={() => {
              navigateTo(activeBooking ? 'PAYMENT' : 'BOOKING_SLOTS');
            }}
          />
        );
      case 'TICKET':
        return (
          <TicketScreen
            bookingId={ticketBookingId}
            onBack={() => {
              setTicketBookingId(undefined);
              navigateTo('HOME');
            }}
          />
        );
      case 'GYM_POOL':
        return (
          <GymMembershipScreen
            onBack={() => navigateTo('HOME')}
            onBook={() => navigateTo('BOOKING_SLOTS')}
          />
        );
      case 'GAMING':
        return (
          <GamingScreen
            onBack={() => navigateTo('HOME')}
            onCheckout={() => navigateTo('PAYMENT')}
          />
        );
      case 'CONTRACTS':
        return <ContractsScreen onBack={() => navigateTo('HOME')} />;
      case 'COACHES':
        return <CoachesScreen onBack={() => navigateTo('HOME')} />;
      case 'MATCHMAKING':
        return <MatchmakingScreen onBack={() => navigateTo('HOME')} />;
      case 'WALLET':
        return <WalletScreen onBack={() => navigateTo('HOME')} />;
      case 'HISTORY':
        return (
          <HistoryScreen
            onBack={() => navigateTo('PROFILE')}
            onViewTicket={(id) => {
              setTicketBookingId(id);
              navigateTo('TICKET');
            }}
          />
        );
      case 'RATINGS':
        return <RatingsScreen onBack={() => navigateTo('HOME')} />;
      case 'CHAT':
        return <ChatScreen onBack={() => navigateTo('HOME')} />;
      case 'NOTIFICATIONS':
        return (
          <NotificationsScreen
            onBack={() => navigateTo('HOME')}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );
      case 'OFFLINE':
        return (
          <OfflineScreen
            onBack={() => navigateTo('HOME')}
            onOpenTicket={() => navigateTo('TICKET')}
          />
        );
      case 'PROCESS':
        return (
          <ProcessScreen
            onBack={() => navigateTo('HOME')}
            onStartBooking={() => navigateTo('BOOKING_SLOTS')}
          />
        );
      case 'PROFILE':
        return (
          <ProfileScreen
            onBack={() => navigateTo('HOME')}
            onNavigate={(screen) => navigateTo(screen)}
            onOpenWallet={() => navigateTo('WALLET')}
            onOpenHistory={() => navigateTo('HISTORY')}
            onOpenVouchers={() => navigateTo('VOUCHERS')}
          />
        );
      case 'SPLASH':
        return (
          <SplashScreen
            onStart={() => navigateTo('WELCOME')}
            onSkipToHome={() => navigateTo('HOME')}
          />
        );
      case 'WELCOME':
        return (
          <WelcomeScreen
            onLogin={() => navigateTo('AUTH')}
            onOnboarding={() => navigateTo('ONBOARDING')}
            onGuest={() => navigateTo('HOME')}
          />
        );
      case 'ONBOARDING':
        return <OnboardingScreen onFinish={() => navigateTo('HOME')} />;
      case 'AUTH':
        return (
          <AuthScreen
            onBack={() => navigateTo('WELCOME')}
            onSuccess={() => navigateTo('HOME')}
            onGuest={() => navigateTo('HOME')}
          />
        );
      default:
        return (
          <FacilityListScreen
            onSelectFacility={() => navigateTo('BOOKING_SLOTS')}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );
    }
  };

  if (!fontsLoaded && !fontsError) {
    return (
      <View
        style={[
          styles.loadingFallback,
          { backgroundColor: theme.background },
        ]}
      />
    );
  }

  const activeDockTab =
    currentScreen === 'HOME'
      ? 'HOME'
      : currentScreen === 'BOOKING_SLOTS'
        ? 'BOOKING_SLOTS'
        : currentScreen === 'CONTRACTS'
          ? 'CONTRACTS'
          : currentScreen === 'PROFILE'
            ? 'PROFILE'
            : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <Animated.View style={[styles.themeLayer, { opacity: themeFade }]}>
        <View style={styles.viewport}>{renderScreen()}</View>

        <ServicesDropupMenu
          visible={showServicesMenu}
          currentScreen={currentScreen}
          onSelect={(target: ServiceScreenTarget) => navigateTo(target)}
          onClose={() => setShowServicesMenu(false)}
        />

        {!hideBottomDock ? (
        <View
          style={[
            styles.bottomDock,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.dockInner}>
            <Pressable
              style={styles.dockTab}
              onPress={() => navigateTo('HOME')}
            >
              <Home
                size={18}
                strokeWidth={1.75}
                color={activeDockTab === 'HOME' ? theme.accent : theme.textMuted}
              />
              <Text
                style={[
                  styles.dockLabel,
                  {
                    color: activeDockTab === 'HOME' ? theme.accent : theme.textMuted,
                    fontFamily:
                      activeDockTab === 'HOME' ? fonts.bodySemiBold : fonts.body,
                  },
                ]}
              >
                Trang chủ
              </Text>
            </Pressable>

            <Pressable
              style={styles.dockTab}
              onPress={() => navigateTo('BOOKING_SLOTS')}
            >
              <Calendar
                size={18}
                strokeWidth={1.75}
                color={
                  activeDockTab === 'BOOKING_SLOTS' ? theme.accent : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.dockLabel,
                  {
                    color:
                      activeDockTab === 'BOOKING_SLOTS'
                        ? theme.accent
                        : theme.textMuted,
                    fontFamily:
                      activeDockTab === 'BOOKING_SLOTS'
                        ? fonts.bodySemiBold
                        : fonts.body,
                  },
                ]}
              >
                Đặt sân
              </Text>
            </Pressable>

            <View style={styles.centerTabWrapper}>
              <Pressable
                onPress={() => setShowServicesMenu((v) => !v)}
                accessibilityLabel="Mở menu tiện ích"
                style={({ pressed }) => [
                  styles.centerServicesBtn,
                  {
                    backgroundColor: showServicesMenu
                      ? theme.accentSecondary
                      : theme.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <LayoutGrid
                  size={20}
                  strokeWidth={2}
                  color={
                    showServicesMenu ? theme.onAccentSecondary : theme.onAccent
                  }
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.dockTab}
              onPress={() => navigateTo('CONTRACTS')}
            >
              <FileText
                size={18}
                strokeWidth={1.75}
                color={
                  activeDockTab === 'CONTRACTS' ? theme.accent : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.dockLabel,
                  {
                    color:
                      activeDockTab === 'CONTRACTS' ? theme.accent : theme.textMuted,
                    fontFamily:
                      activeDockTab === 'CONTRACTS'
                        ? fonts.bodySemiBold
                        : fonts.body,
                  },
                ]}
              >
                Hợp đồng
              </Text>
            </Pressable>

            <Pressable
              style={styles.dockTab}
              onPress={() => navigateTo('PROFILE')}
            >
              <User
                size={18}
                strokeWidth={1.75}
                color={
                  activeDockTab === 'PROFILE' ? theme.accent : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.dockLabel,
                  {
                    color:
                      activeDockTab === 'PROFILE' ? theme.accent : theme.textMuted,
                    fontFamily:
                      activeDockTab === 'PROFILE' ? fonts.bodySemiBold : fonts.body,
                  },
                ]}
              >
                Cá nhân
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingFallback: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  themeLayer: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  bottomDock: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  dockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 680,
  },
  dockTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  centerTabWrapper: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerServicesBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: {
    fontSize: 11,
  },
});
