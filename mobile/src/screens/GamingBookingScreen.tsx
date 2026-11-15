import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { GamingMachine } from '../types';

export const GamingBookingScreen: React.FC = () => {
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [startingMachine, setStartingMachine] = useState<string | null>(null);

  const zones = ['ALL', 'STANDARD', 'VIP', 'STREAMING'];

  useEffect(() => {
    loadMachines();
  }, [selectedZone]);

  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await api.getGamingMachines();
      let list = data || [];
      if (selectedZone !== 'ALL') {
        list = list.filter((m) => m.zone === selectedZone);
      }
      setMachines(list);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải danh sách máy gaming');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (machine: GamingMachine) => {
    setStartingMachine(machine.machineCode);
    try {
      const session = await api.startGamingSession(machine.machineCode);
      Alert.alert(
        'Bắt đầu phiên chơi!',
        `Phiên chơi ${session.sessionCode} tại máy ${machine.machineCode} đã bắt đầu.\nVí nội bộ tạm giữ: ${session.totalHoldAmount?.toLocaleString('vi-VN')} đ (Block 15 phút).`,
      );
      loadMachines();
    } catch (err: any) {
      Alert.alert('Không thể mở máy', err.message || 'Máy đang bận hoặc tài khoản đang có phiên');
    } finally {
      setStartingMachine(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Khu Máy Gaming & Esports</Text>
      <Text style={styles.subtitle}>100 máy cấu hình cao - Khóa/mở máy tự động & Trừ ví theo phút</Text>

      {/* Zone Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {zones.map((z) => (
          <TouchableOpacity
            key={z}
            style={[styles.filterChip, selectedZone === z && styles.filterChipActive]}
            onPress={() => setSelectedZone(z)}
          >
            <Text style={[styles.filterText, selectedZone === z && styles.filterTextActive]}>
              {z === 'ALL' ? 'Tất cả khu' : z === 'STANDARD' ? 'Sảnh 50 máy' : z === 'VIP' ? 'Phòng Riêng' : 'Phòng Esport'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list}>
          <View style={styles.grid}>
            {machines.map((m) => {
              const isAvailable = m.status === 'IDLE';
              const isInUse = m.status === 'IN_USE';

              return (
                <View key={m._id} style={styles.machineCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.machineCode}>{m.machineCode}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        isAvailable && styles.dotAvailable,
                        isInUse && styles.dotInUse,
                      ]}
                    />
                  </View>

                  <Text style={styles.zoneText}>{m.zone}</Text>
                  <Text style={styles.specsText}>{m.specs?.gpu || 'RTX 4060'}</Text>
                  <Text style={styles.priceText}>{m.hourlyPrice?.toLocaleString('vi-VN')} đ/h</Text>

                  <TouchableOpacity
                    style={[styles.playButton, !isAvailable && styles.playButtonDisabled]}
                    disabled={!isAvailable || startingMachine === m.machineCode}
                    onPress={() => handleStartSession(m)}
                  >
                    {startingMachine === m.machineCode ? (
                      <ActivityIndicator size="small" color={colors.primaryText} />
                    ) : (
                      <Text style={[styles.playButtonText, !isAvailable && { color: colors.textMuted }]}>
                        {isAvailable ? 'Chơi Ngay' : m.status}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.primaryText,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  machineCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  machineCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  dotAvailable: {
    backgroundColor: colors.volt,
  },
  dotInUse: {
    backgroundColor: colors.danger,
  },
  zoneText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  specsText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 6,
  },
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  playButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  playButtonText: {
    color: colors.primaryText,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
