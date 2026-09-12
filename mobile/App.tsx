// mobile/App.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
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

type TabType = 'EXPLORE' | 'SLOTS' | 'PAYMENT' | 'TICKET' | 'HISTORY' | 'GYM' | 'MATCH';

export default function App() {
  const { user, token, logout } = useAuthStore();
  const { activeBooking, resetBooking } = useBookingStore();

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

        {activeTab === 'GYM' && (
          <GymMembershipScreen />
        )}

        {activeTab === 'MATCH' && (
          <MatchmakingScreen />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('EXPLORE')}
        >
          <Text style={[styles.navIcon, activeTab === 'EXPLORE' && styles.activeNavText]}>
            🏟️
          </Text>
          <Text style={[styles.navLabel, activeTab === 'EXPLORE' && styles.activeNavText]}>
            Khám phá
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('SLOTS')}
        >
          <Text style={[styles.navIcon, activeTab === 'SLOTS' && styles.activeNavText]}>
            ⏰
          </Text>
          <Text style={[styles.navLabel, activeTab === 'SLOTS' && styles.activeNavText]}>
            Lịch Sân
          </Text>
        </TouchableOpacity>

        {activeBooking && activeBooking.status === 'HELD' && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('PAYMENT')}
          >
            <View style={styles.paymentBadgeIndicator}>
              <Text style={styles.navIcon}>💳</Text>
              <View style={styles.badgeDot} />
            </View>
            <Text style={[styles.navLabel, activeTab === 'PAYMENT' && styles.activeNavText]}>
              Thanh toán
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setTicketBookingId(undefined);
            setActiveTab('TICKET');
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'TICKET' && styles.activeNavText]}>
            🎟️
          </Text>
          <Text style={[styles.navLabel, activeTab === 'TICKET' && styles.activeNavText]}>
            Vé Của Tôi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('GYM')}
        >
          <Text style={[styles.navIcon, activeTab === 'GYM' && styles.activeNavText]}>
            🏋️
          </Text>
          <Text style={[styles.navLabel, activeTab === 'GYM' && styles.activeNavText]}>
            Gym
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('MATCH')}
        >
          <Text style={[styles.navIcon, activeTab === 'MATCH' && styles.activeNavText]}>
            🤝
          </Text>
          <Text style={[styles.navLabel, activeTab === 'MATCH' && styles.activeNavText]}>
            Cáp Kèo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.navIcon, activeTab === 'HISTORY' && styles.activeNavText]}>
            📜
          </Text>
          <Text style={[styles.navLabel, activeTab === 'HISTORY' && styles.activeNavText]}>
            Lịch Sử
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingBottom: 16,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeNavText: {
    color: colors.primaryLight,
    fontWeight: '800',
  },
  paymentBadgeIndicator: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
});
