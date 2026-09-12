// mobile/src/screens/MatchmakingScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { api } from '../api/client';

export const MatchmakingScreen: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [sportType, setSportType] = useState('FOOTBALL');
  const [matchDate, setMatchDate] = useState('2026-09-20T19:00:00.000Z');
  const [locationDescription, setLocationDescription] = useState('');
  const [slotsNeeded, setSlotsNeeded] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  const sports = [
    { label: 'Tất cả', value: '' },
    { label: 'Bóng đá', value: 'FOOTBALL' },
    { label: 'Cầu lông', value: 'BADMINTON' },
    { label: 'Tennis', value: 'TENNIS' },
    { label: 'Esports', value: 'ESPORTS' },
  ];

  useEffect(() => {
    loadMatches();
  }, [selectedSport]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api.getMatchRequests(selectedSport || undefined);
      setMatches(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách cáp kèo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    try {
      const res = await api.joinMatch(matchId);
      Alert.alert('Thành công', 'Bạn đã tham gia kèo thể thao này thành công!');
      loadMatches();
    } catch (err: any) {
      Alert.alert('Không thể tham gia', err.message || 'Lỗi tham gia kèo');
    }
  };

  const handleCreateMatch = async () => {
    if (!slotsNeeded || parseInt(slotsNeeded, 10) < 1) {
      Alert.alert('Lỗi', 'Vui lòng nhập số người cần tìm hợp lệ');
      return;
    }

    setSubmitting(true);
    try {
      await api.createMatchRequest({
        sportType,
        matchDate,
        locationDescription: locationDescription.trim() || undefined,
        slotsNeeded: parseInt(slotsNeeded, 10),
      });

      Alert.alert('Thành công', 'Đã đăng bài tìm đồng đội thành công!');
      setShowCreateModal(false);
      setLocationDescription('');
      setSlotsNeeded('2');
      loadMatches();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo bài đăng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cáp Kèo Thể Thao</Text>
          <Text style={styles.headerSubtitle}>Tìm đối thủ & ghép đồng đội giao lưu (Mục 6.3)</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createBtnText}>+ Tạo Kèo</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {sports.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[
              styles.filterPill,
              selectedSport === s.value && styles.activeFilterPill,
            ]}
            onPress={() => setSelectedSport(s.value)}
          >
            <Text
              style={[
                styles.filterText,
                selectedSport === s.value && styles.activeFilterText,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Match Requests List */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có bài đăng cáp kèo nào.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyBtnText}>Tạo bài đăng đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          matches.map((m) => {
            const isFull = m.status === 'FULL' || m.slotsFilled >= m.slotsNeeded;

            return (
              <View key={m._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.sportBadge}>
                    <Text style={styles.sportBadgeText}>{m.sportType}</Text>
                  </View>
                  <Text style={[styles.statusText, isFull && styles.fullStatusText]}>
                    {isFull ? 'ĐÃ ĐỦ NGƯỜI' : `CẦN TÌM +${m.slotsNeeded - m.slotsFilled}`}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>
                  {m.locationDescription || 'Trận đấu giao lưu thân thiện'}
                </Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(m.matchDate).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Đã có:</Text>
                  <Text style={styles.detailValue}>
                    {m.slotsFilled} / {m.slotsNeeded} người tham gia
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Chủ kèo:</Text>
                  <Text style={styles.detailValue}>{m.creatorId?.fullName || 'Ẩn danh'}</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          (m.slotsFilled / Math.max(1, m.slotsNeeded)) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>

                {!isFull && (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoinMatch(m._id)}
                  >
                    <Text style={styles.joinBtnText}>Tham Gia Ngay</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đăng Bài Cáp Kèo</Text>
            <Text style={styles.modalSubtitle}>Tìm thêm người chơi cùng đam mê</Text>

            <Text style={styles.inputLabel}>Môn thể thao</Text>
            <View style={styles.sportOptionRow}>
              {['FOOTBALL', 'BADMINTON', 'TENNIS', 'ESPORTS'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sportOption, sportType === s && styles.selectedSportOption]}
                  onPress={() => setSportType(s)}
                >
                  <Text
                    style={[
                      styles.sportOptionText,
                      sportType === s && styles.selectedSportOptionText,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Mô tả / Sân / Vị trí cần tuyển</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Sân Chùa Láng lúc 19h, cần 2 bạn đá hậu vệ..."
              placeholderTextColor="#64748B"
              value={locationDescription}
              onChangeText={setLocationDescription}
            />

            <Text style={styles.inputLabel}>Số lượng người cần tìm</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={slotsNeeded}
              onChangeText={setSlotsNeeded}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateMatch}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Đang tạo...' : 'Đăng bài'}
                </Text>
              </TouchableOpacity>
            </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  createBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterScroll: {
    maxHeight: 45,
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterPill: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sportBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportBadgeText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#38BDF8',
  },
  fullStatusText: {
    color: '#10B981',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  joinBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  sportOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sportOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedSportOption: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  sportOptionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  selectedSportOptionText: {
    color: '#8B5CF6',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
