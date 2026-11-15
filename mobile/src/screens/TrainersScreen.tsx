import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';
import { StaffProfile } from '../types';

export const TrainersScreen: React.FC = () => {
  const [trainers, setTrainers] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [selectedTrainer, setSelectedTrainer] = useState<StaffProfile | null>(null);
  const [sessionDate, setSessionDate] = useState('2026-11-10');
  const [startTime, setStartTime] = useState('08:00');
  const [bookingLoading, setBookingLoading] = useState(false);

  const specialties = ['ALL', 'Gym', 'Yoga', 'Boxing', 'Pilates'];

  useEffect(() => {
    loadTrainers();
  }, [selectedSpecialty]);

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const data = await api.getTrainers(selectedSpecialty === 'ALL' ? undefined : selectedSpecialty);
      setTrainers(data || []);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải danh sách HLV');
    } finally {
      setLoading(false);
    }
  };

  const handleBookPt = async () => {
    if (!selectedTrainer) return;
    setBookingLoading(true);
    try {
      await api.bookPtSession({
        trainerId: selectedTrainer._id,
        sessionDate,
        startTime,
        durationMinutes: 60,
      });
      Alert.alert('Thành công', `Đã đặt lịch tập PT 1-1 với ${selectedTrainer.fullName} lúc ${startTime} ngày ${sessionDate}!`);
      setSelectedTrainer(null);
    } catch (err: any) {
      Alert.alert('Lỗi đặt lịch', err.message || 'Khung giờ này đã có người đặt');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Huấn Luyện Viên Cá Nhân (PT 1-1)</Text>
      <Text style={styles.subtitle}>Đội ngũ HLV chuyên nghiệp đạt chuẩn NASM / CrossFit Quốc tế</Text>

      {/* Specialty Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {specialties.map((spec) => (
          <TouchableOpacity
            key={spec}
            style={[styles.filterChip, selectedSpecialty === spec && styles.filterChipActive]}
            onPress={() => setSelectedSpecialty(spec)}
          >
            <Text style={[styles.filterText, selectedSpecialty === spec && styles.filterTextActive]}>
              {spec === 'ALL' ? 'Tất cả bộ môn' : spec}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list}>
          {trainers.map((t) => (
            <View key={t._id} style={styles.trainerCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{t.fullName.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{t.fullName}</Text>
                  <Text style={styles.rate}>{t.hourlyRate?.toLocaleString('vi-VN')} đ / giờ</Text>
                  <View style={styles.tagRow}>
                    {t.specialties?.map((s, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {t.bio ? <Text style={styles.bio}>{t.bio}</Text> : null}

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => setSelectedTrainer(t)}
              >
                <Text style={styles.bookButtonText}>Đặt Lịch Tập Ngay</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Booking Modal Sheet */}
      {selectedTrainer && (
        <View style={styles.bookingSheet}>
          <Text style={styles.sheetTitle}>Đặt Lịch PT 1-1: {selectedTrainer.fullName}</Text>
          <Text style={styles.sheetSubtitle}>Đơn giá: {selectedTrainer.hourlyRate?.toLocaleString('vi-VN')} đ / 60 phút</Text>

          <Text style={styles.inputLabel}>Ngày tập (YYYY-MM-DD):</Text>
          <TextInput
            style={styles.input}
            value={sessionDate}
            onChangeText={setSessionDate}
            placeholder="2026-11-10"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>Giờ bắt đầu (HH:mm):</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="08:00"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.sheetActionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSelectedTrainer(null)}
            >
              <Text style={styles.cancelText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleBookPt}
              disabled={bookingLoading}
            >
              {bookingLoading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.confirmText}>Xác Nhận Đặt Lịch</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  trainerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  rate: {
    fontSize: 14,
    color: colors.volt,
    fontWeight: '600',
    marginVertical: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: colors.primary,
    fontSize: 11,
  },
  bio: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  bookButtonText: {
    color: colors.primaryText,
    fontWeight: 'bold',
    fontSize: 14,
  },
  bookingSheet: {
    backgroundColor: colors.surfaceLight,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.volt,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelText: {
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmText: {
    color: colors.primaryText,
    fontWeight: 'bold',
  },
});
