// mobile/src/screens/GamingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface PCStation {
  id: string;
  name: string;
  zone: 'VIP_RTX4090' | 'STANDARD_RTX4080' | 'STREAMING';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  ratePerHour: number;
}

export const GamingScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [selectedStation, setSelectedStation] = useState<PCStation | null>(null);
  const [selectedHours, setSelectedHours] = useState<number>(2);

  const pcStations: PCStation[] = [
    { id: 'PC-01', name: 'Máy VIP 01', zone: 'VIP_RTX4090', status: 'AVAILABLE', ratePerHour: 25000 },
    { id: 'PC-02', name: 'Máy VIP 02', zone: 'VIP_RTX4090', status: 'AVAILABLE', ratePerHour: 25000 },
    { id: 'PC-03', name: 'Máy VIP 03', zone: 'VIP_RTX4090', status: 'OCCUPIED', ratePerHour: 25000 },
    { id: 'PC-04', name: 'Máy VIP 04', zone: 'VIP_RTX4090', status: 'AVAILABLE', ratePerHour: 25000 },
    { id: 'PC-21', name: 'Máy Sảnh 21', zone: 'STANDARD_RTX4080', status: 'AVAILABLE', ratePerHour: 18000 },
    { id: 'PC-22', name: 'Máy Sảnh 22', zone: 'STANDARD_RTX4080', status: 'AVAILABLE', ratePerHour: 18000 },
    { id: 'PC-23', name: 'Máy Sảnh 23', zone: 'STANDARD_RTX4080', status: 'OCCUPIED', ratePerHour: 18000 },
    { id: 'PC-24', name: 'Máy Sảnh 24', zone: 'STANDARD_RTX4080', status: 'AVAILABLE', ratePerHour: 18000 },
    { id: 'PC-88', name: 'Phòng Stream 88', zone: 'STREAMING', status: 'AVAILABLE', ratePerHour: 40000 },
  ];

  const handleBookPC = () => {
    if (!selectedStation) {
      Alert.alert('Chưa chọn máy', 'Vui lòng chọn một máy trạm còn trống.');
      return;
    }
    const total = selectedStation.ratePerHour * selectedHours;
    Alert.alert(
      'Xác nhận mở máy',
      `Bạn đã chọn ${selectedStation.name} (${selectedHours} giờ).\nTổng tiền: ${total.toLocaleString('vi-VN')} đ\nCơ chế tính cước cuốn chiếu 15 phút bảo vệ quyền lợi.`,
      [{ text: 'Đồng ý', onPress: () => Alert.alert('Thành công', 'Đã cấp lệnh mở máy từ xa!') }, { text: 'Hủy', style: 'cancel' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <TwoLineText
            primary="Tổ Hợp Cyber Gaming 100 Máy"
            secondary="Cấu hình RTX 4090 & Màn hình 360Hz Esports"
            badge="100 MÁY"
            badgeColor={colors.primary}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Rule banner */}
          <View style={styles.ruleBanner}>
            <TwoLineText
              primary="Cơ Chế Tính Cước Cuốn Chiếu 15 Phút"
              secondary="Trả máy trước hạn được hoàn tiền thừa chính xác theo số phút thực tế vào ví Phanta Pay."
              primaryStyle={{ fontSize: 13, color: '#fbbf24' }}
              secondaryStyle={{ fontSize: 11, color: '#e2e8f0' }}
            />
          </View>

          {/* Station Matrix */}
          <Text style={styles.sectionTitle}>Sơ Đồ Máy Trạm Trực Tuyến</Text>
          <View style={styles.grid}>
            {pcStations.map((pc) => {
              const isSelected = selectedStation?.id === pc.id;
              const isOccupied = pc.status === 'OCCUPIED';

              return (
                <TouchableOpacity
                  key={pc.id}
                  disabled={isOccupied}
                  onPress={() => setSelectedStation(pc)}
                  style={[
                    styles.pcCard,
                    isOccupied && styles.pcOccupied,
                    isSelected && styles.pcSelected,
                  ]}
                >
                  <Text style={[styles.pcName, isSelected && styles.pcNameSelected]}>{pc.id}</Text>
                  <Text style={styles.pcZone}>{pc.name}</Text>
                  <Text style={[styles.pcRate, isSelected && styles.pcRateSelected]}>
                    {pc.ratePerHour.toLocaleString('vi-VN')} đ/h
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: isOccupied ? colors.danger : colors.success }]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hours Picker */}
          {selectedStation && (
            <View style={styles.bookingBox}>
              <TwoLineText
                primary={`Đang chọn: ${selectedStation.name}`}
                secondary={`Đơn giá: ${selectedStation.ratePerHour.toLocaleString('vi-VN')} đ/giờ`}
                primaryStyle={{ color: colors.primary }}
              />

              <Text style={styles.hoursLabel}>Chọn số giờ nạp trước:</Text>
              <View style={styles.hoursRow}>
                {[1, 2, 3, 5].map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setSelectedHours(h)}
                    style={[styles.hourBtn, selectedHours === h && styles.hourBtnSelected]}
                  >
                    <Text style={[styles.hourBtnText, selectedHours === h && styles.hourBtnTextSelected]}>
                      {h} Giờ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng tạm tính:</Text>
                <Text style={styles.totalValue}>
                  {(selectedStation.ratePerHour * selectedHours).toLocaleString('vi-VN')} đ
                </Text>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleBookPC}>
                <Text style={styles.submitText}>Mở Máy & Bắt Đầu Chơi →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: 8, backgroundColor: colors.card, borderRadius: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scroll: { paddingBottom: 30 },
  ruleBanner: {
    backgroundColor: '#78350f30',
    borderWidth: 1,
    borderColor: '#f59e0b40',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pcCard: {
    width: '31%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  },
  pcOccupied: { opacity: 0.4 },
  pcSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  pcName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  pcNameSelected: { color: colors.primary },
  pcZone: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  pcRate: { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 4 },
  pcRateSelected: { color: '#fff' },
  statusDot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', top: 8, right: 8 },
  bookingBox: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  hoursLabel: { fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginTop: 12, marginBottom: 8 },
  hoursRow: { flexDirection: 'row', gap: 8 },
  hourBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  hourBtnSelected: { backgroundColor: colors.primary },
  hourBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  hourBtnTextSelected: { color: '#000' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  totalLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  totalValue: { fontSize: 18, color: colors.primary, fontWeight: '900' },
  submitBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
