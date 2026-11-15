// mobile/src/screens/FacilityListScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { Facility } from '../types';
import { useBookingStore } from '../store/useBookingStore';

const SPORT_CATEGORIES = [
  { key: 'ALL', label: 'Tất cả', icon: '⚡' },
  { key: 'FOOTBALL', label: 'Bóng đá', icon: '⚽' },
  { key: 'BADMINTON', label: 'Cầu lông', icon: '🏸' },
  { key: 'PICKLEBALL', label: 'Pickleball', icon: '🏓' },
  { key: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { key: 'ESPORTS', label: 'Esports', icon: '🎮' },
  { key: 'GYM', label: 'Gym', icon: '🏋️' },
];

interface Props {
  onSelectFacility: (fac: Facility) => void;
}

export const FacilityListScreen: React.FC<Props> = ({ onSelectFacility }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { setSelectedFacility } = useBookingStore();

  const fetchFacilities = async (category: string) => {
    try {
      setLoading(true);
      const data = await api.getFacilities(category === 'ALL' ? undefined : category);
      setFacilities(data);
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities(selectedCategory);
  }, [selectedCategory]);

  const filteredFacilities = facilities.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (fac: Facility) => {
    setSelectedFacility(fac);
    onSelectFacility(fac);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Khám Phá Sân Bãi</Text>
          <Text style={styles.headerSubtitle}>Tìm kiếm & đặt sân thể thao, esports gần bạn nhất</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên sân, địa chỉ, quận huyện..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Sport Categories Horizontal Scroll */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={SPORT_CATEGORIES}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => {
              const active = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  style={[styles.categoryPill, active && styles.activeCategoryPill]}
                  onPress={() => setSelectedCategory(item.key)}
                >
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                  <Text style={[styles.categoryLabel, active && styles.activeCategoryLabel]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Facilities List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách tổ hợp sân...</Text>
          </View>
        ) : filteredFacilities.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>🏟️</Text>
            <Text style={styles.emptyTitle}>Chưa có sân nào</Text>
            <Text style={styles.emptySubtitle}>Không tìm thấy cơ sở thể thao phù hợp bộ lọc.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredFacilities}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.facilityList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.facilityCard}
                activeOpacity={0.8}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIcon}>🏟️</Text>
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.facilityName}>{item.name}</Text>
                    <Text style={styles.facilityAddress} numberOfLines={1}>
                      📍 {item.address}
                    </Text>
                  </View>
                </View>

                {/* Tags & Time */}
                <View style={styles.cardFooter}>
                  <View style={styles.sportTag}>
                    <Text style={styles.sportTagText}>
                      {item.sportTypes?.join(' • ') || 'THỂ THAO'}
                    </Text>
                  </View>

                  <View style={styles.openHourBadge}>
                    <Text style={styles.openHourText}>
                      🕒 {item.openHour || '06:00'} - {item.closeHour || '22:00'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardAction}>
                  <Text style={styles.cardActionText}>Xem lịch trống & Đặt sân →</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
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
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoriesWrapper: {
    marginBottom: 14,
  },
  categoryList: {
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeCategoryPill: {
    backgroundColor: '#00f2fe',
    borderColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeCategoryLabel: {
    color: '#090d16',
    fontWeight: '900',
  },
  facilityList: {
    paddingBottom: 30,
    gap: 14,
  },
  facilityCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  facilityAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  sportTag: {
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  sportTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00f2fe',
    fontFamily: 'monospace',
  },
  openHourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openHourText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  cardAction: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00f2fe',
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
