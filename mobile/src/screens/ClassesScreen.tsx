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
import { ClassSession } from '../types';

export const ClassesScreen: React.FC = () => {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const types = ['ALL', 'YOGA', 'ZUMBA', 'PILATES', 'BOXING', 'SPINNING'];

  useEffect(() => {
    loadClasses();
  }, [selectedType]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await api.getClasses(undefined, selectedType === 'ALL' ? undefined : selectedType);
      setClasses(data || []);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải lịch lớp học');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (session: ClassSession) => {
    setRegisteringId(session._id);
    try {
      await api.registerClass(session._id);
      Alert.alert('Thành công', `Đăng ký thành công lớp ${session.name}!`);
      loadClasses();
    } catch (err: any) {
      Alert.alert('Không thể đăng ký', err.message || 'Lớp học đã kín chỗ hoặc có lỗi');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lớp Học Thể Thao Nhóm</Text>
      <Text style={styles.subtitle}>Đặt chỗ trước - Không lo hết suất tập</Text>

      {/* Filter by class type */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {types.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, selectedType === t && styles.filterChipActive]}
            onPress={() => setSelectedType(t)}
          >
            <Text style={[styles.filterText, selectedType === t && styles.filterTextActive]}>
              {t === 'ALL' ? 'Tất cả lớp' : t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list}>
          {classes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Chưa có lịch buổi học nào sắp diễn ra</Text>
            </View>
          ) : (
            classes.map((cls) => {
              const isFull = cls.bookedCount >= cls.capacity;
              const fillPercent = Math.min(100, Math.round((cls.bookedCount / cls.capacity) * 100));

              return (
                <View key={cls._id} style={styles.classCard}>
                  <View style={styles.headerRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{cls.classType}</Text>
                    </View>
                    <Text style={styles.price}>{cls.pricePerSession?.toLocaleString('vi-VN')} đ</Text>
                  </View>

                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.trainer}>HLV: {cls.trainerName}</Text>
                  <Text style={styles.timeInfo}>
                    🕒 {cls.startTime} - {cls.endTime} | 📍 {cls.roomName || 'Studio A'}
                  </Text>

                  {/* Capacity Bar */}
                  <View style={styles.capacityContainer}>
                    <View style={styles.capacityLabelRow}>
                      <Text style={styles.capacityLabel}>Sức chứa lớp:</Text>
                      <Text style={[styles.capacityCount, isFull && { color: colors.danger }]}>
                        {cls.bookedCount}/{cls.capacity} học viên
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${fillPercent}%` },
                          isFull && { backgroundColor: colors.danger },
                        ]}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.regButton, isFull && styles.regButtonDisabled]}
                    onPress={() => handleRegister(cls)}
                    disabled={isFull || registeringId === cls._id}
                  >
                    {registeringId === cls._id ? (
                      <ActivityIndicator color={colors.primaryText} />
                    ) : (
                      <Text style={[styles.regButtonText, isFull && { color: colors.textMuted }]}>
                        {isFull ? 'Lớp Đã Đủ Sức Chứa' : 'Đăng Ký Tham Gia'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: colors.volt,
    fontSize: 12,
    fontWeight: 'bold',
  },
  price: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  className: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  trainer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeInfo: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  capacityContainer: {
    marginTop: 12,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  capacityCount: {
    fontSize: 12,
    color: colors.volt,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.volt,
  },
  regButton: {
    backgroundColor: colors.volt,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  regButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  regButtonText: {
    color: colors.primaryText,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
