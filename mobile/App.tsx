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
} from 'react-native';
import { colors } from './src/theme/colors';
import { useAuthStore } from './src/store/useAuthStore';
import { useBookingStore } from './src/store/useBookingStore';
import { AuthScreen } from './src/screens/AuthScreen';
import { FacilityListScreen } from './src/screens/FacilityListScreen';
import { VenueSlotGridScreen } from './src/screens/VenueSlotGridScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { TicketScreen } from './src/screens/TicketScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { GymMembershipScreen } from './src/screens/GymMembershipScreen';
import { MatchmakingScreen } from './src/screens/MatchmakingScreen';
import { TrainersScreen } from './src/screens/TrainersScreen';
import { ClassesScreen } from './src/screens/ClassesScreen';
import { TournamentsScreen } from './src/screens/TournamentsScreen';
import { GamingBookingScreen } from './src/screens/GamingBookingScreen';

type TabType =
  | 'EXPLORE'
  | 'SLOTS'
  | 'PAYMENT'
  | 'TICKET'
  | 'HISTORY'
  | 'GYM'
  | 'PT'
  | 'CLASSES'
  | 'TOURNAMENT'
  | 'GAMING'
  | 'MATCH';

export default function App() {
  const { user, token, logout } = useAuthStore();
  const { activeBooking } = useBookingStore();

  const [activeTab, setActiveTab] = useState<TabType>('EXPLORE');
  const [ticketBookingId, setTicketBookingId] = useState<string | undefined>(undefined);

  // If not logged in, show AuthScreen
  if (!token || !user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthScreen />
      </>
    );
  }

  const handleSelectFacility = () => {
    setActiveTab('SLOTS');
  };

  const handleProceedPayment = () => {
    setActiveTab('PAYMENT');
  };

  const handlePaymentSuccess = () => {
    setActiveTab('TICKET');
  };

  const handleViewTicketFromHistory = (bookingId: string) => {
    setTicketBookingId(bookingId);
    setActiveTab('TICKET');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Global Mini User Header */}
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userGreeting}>Xin chào,</Text>
          <Text style={styles.userName}>{user.fullName || user.phone}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Đăng xuất ⎋</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <View style={styles.content}>
        {activeTab === 'EXPLORE' && (
          <FacilityListScreen onSelectFacility={handleSelectFacility} />
        )}

        {activeTab === 'SLOTS' && (
          <VenueSlotGridScreen
            onBack={() => setActiveTab('EXPLORE')}
            onProceedPayment={handleProceedPayment}
          />
        )}

        {activeTab === 'PAYMENT' && (
          <PaymentScreen
            onBack={() => setActiveTab('SLOTS')}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {activeTab === 'TICKET' && (
          <TicketScreen
            bookingId={ticketBookingId}
            onBack={() => {
              setTicketBookingId(undefined);
              setActiveTab('EXPLORE');
            }}
          />
        )}

        {activeTab === 'HISTORY' && (
          <HistoryScreen onViewTicket={handleViewTicketFromHistory} />
        )}

        {activeTab === 'GYM' && <GymMembershipScreen />}

        {activeTab === 'PT' && <TrainersScreen />}

        {activeTab === 'CLASSES' && <ClassesScreen />}

        {activeTab === 'TOURNAMENT' && <TournamentsScreen />}

        {activeTab === 'GAMING' && <GamingBookingScreen />}

        {activeTab === 'MATCH' && <MatchmakingScreen />}
      </View>

      {/* Bottom Scrollable Navigation Bar */}
      <View style={styles.bottomNavContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomNavScroll}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('EXPLORE')}
          >
            <Text style={[styles.navIcon, activeTab === 'EXPLORE' && styles.activeNavText]}>🏟️</Text>
            <Text style={[styles.navLabel, activeTab === 'EXPLORE' && styles.activeNavText]}>Sân Bãi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('SLOTS')}
          >
            <Text style={[styles.navIcon, activeTab === 'SLOTS' && styles.activeNavText]}>📅</Text>
            <Text style={[styles.navLabel, activeTab === 'SLOTS' && styles.activeNavText]}>Lịch Đặt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('GYM')}
          >
            <Text style={[styles.navIcon, activeTab === 'GYM' && styles.activeNavText]}>💪</Text>
            <Text style={[styles.navLabel, activeTab === 'GYM' && styles.activeNavText]}>Gym QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('PT')}
          >
            <Text style={[styles.navIcon, activeTab === 'PT' && styles.activeNavText]}>🏋️</Text>
            <Text style={[styles.navLabel, activeTab === 'PT' && styles.activeNavText]}>PT 1-1</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('CLASSES')}
          >
            <Text style={[styles.navIcon, activeTab === 'CLASSES' && styles.activeNavText]}>🧘</Text>
            <Text style={[styles.navLabel, activeTab === 'CLASSES' && styles.activeNavText]}>Lớp Học</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('GAMING')}
          >
            <Text style={[styles.navIcon, activeTab === 'GAMING' && styles.activeNavText]}>🎮</Text>
            <Text style={[styles.navLabel, activeTab === 'GAMING' && styles.activeNavText]}>Gaming 100M</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('TOURNAMENT')}
          >
            <Text style={[styles.navIcon, activeTab === 'TOURNAMENT' && styles.activeNavText]}>🏆</Text>
            <Text style={[styles.navLabel, activeTab === 'TOURNAMENT' && styles.activeNavText]}>Giải Đấu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('MATCH')}
          >
            <Text style={[styles.navIcon, activeTab === 'MATCH' && styles.activeNavText]}>🤝</Text>
            <Text style={[styles.navLabel, activeTab === 'MATCH' && styles.activeNavText]}>Cáp Kèo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setTicketBookingId(undefined);
              setActiveTab('TICKET');
            }}
          >
            <Text style={[styles.navIcon, activeTab === 'TICKET' && styles.activeNavText]}>🎟️</Text>
            <Text style={[styles.navLabel, activeTab === 'TICKET' && styles.activeNavText]}>Vé Của Tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('HISTORY')}
          >
            <Text style={[styles.navIcon, activeTab === 'HISTORY' && styles.activeNavText]}>📜</Text>
            <Text style={[styles.navLabel, activeTab === 'HISTORY' && styles.activeNavText]}>Lịch Sử</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userGreeting: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logoutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
  },
  logoutText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  bottomNavContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 6,
  },
  bottomNavScroll: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeNavText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
