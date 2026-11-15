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
import { Tournament, TournamentMatch } from '../types';

export const TournamentsScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Register Team Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await api.getTournaments();
      setTournaments(data || []);
      if (data && data.length > 0) {
        handleSelectTournament(data[0]);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải danh sách giải đấu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = async (t: Tournament) => {
    setSelectedTournament(t);
    setMatchesLoading(true);
    try {
      const matchData = await api.getTournamentBracket(t._id);
      setMatches(matchData || []);
    } catch (err: any) {
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleRegisterTeam = async () => {
    if (!selectedTournament || !teamName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên đội thi đấu');
      return;
    }
    setSubmittingTeam(true);
    try {
      await api.registerTournamentTeam(selectedTournament._id, {
        teamName: teamName.trim(),
        members: [
          {
            fullName: captainName || 'Đội Trưởng',
            phone: captainPhone || '0912345678',
            isCaptain: true,
          },
        ],
      });
      Alert.alert('Thành công', `Đội ${teamName} đã đăng ký tham gia ${selectedTournament.name}!`);
      setShowRegModal(false);
      setTeamName('');
    } catch (err: any) {
      Alert.alert('Không thể đăng ký', err.message || 'Lỗi khi đăng ký đội');
    } finally {
      setSubmittingTeam(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giải Đấu Thể Thao & Esports</Text>
      <Text style={styles.subtitle}>Bốc thăm chia nhánh & Cập nhật tỷ số trực tiếp</Text>

      {/* Tournament Selector Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tournamentScroll}>
        {tournaments.map((t) => (
          <TouchableOpacity
            key={t._id}
            style={[
              styles.tournamentChip,
              selectedTournament?._id === t._id && styles.tournamentChipActive,
            ]}
            onPress={() => handleSelectTournament(t)}
          >
            <Text
              style={[
                styles.tournamentChipText,
                selectedTournament?._id === t._id && styles.tournamentChipTextActive,
              ]}
            >
              🏆 {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedTournament && (
        <View style={styles.bannerCard}>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerName}>{selectedTournament.name}</Text>
            <Text style={styles.bannerSport}>Môn: {selectedTournament.sportOrGame} ({selectedTournament.type})</Text>
            <Text style={styles.bannerPrize}>
              Giải thưởng: {selectedTournament.prizePool?.toLocaleString('vi-VN')} đ | Lệ phí: {selectedTournament.entryFee?.toLocaleString('vi-VN')} đ/đội
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => setShowRegModal(true)}
          >
            <Text style={styles.bannerButtonText}>Đăng Ký Đội</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bracket / Matches Section */}
      <Text style={styles.bracketTitle}>Sơ Đồ Nhánh Đấu Trực Tuyến</Text>

      {matchesLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
      ) : matches.length === 0 ? (
        <View style={styles.noMatches}>
          <Text style={styles.noMatchesText}>Chưa có sơ đồ nhánh đấu (Đang mở đăng ký)</Text>
        </View>
      ) : (
        <ScrollView style={styles.matchesList}>
          {matches.map((m) => {
            const isCompleted = m.status === 'COMPLETED';
            return (
              <View key={m._id} style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <Text style={styles.matchCode}>Trận: {m.matchCode} (Vòng {m.round})</Text>
                  <Text style={[styles.matchStatus, isCompleted && { color: colors.volt }]}>
                    {m.status}
                  </Text>
                </View>

                {/* Team 1 */}
                <View style={[styles.teamRow, m.winnerId === m.team1Id && styles.winnerTeam]}>
                  <Text style={[styles.teamName, m.winnerId === m.team1Id && styles.winnerText]}>
                    {m.team1Name || 'Chờ xác định'}
                  </Text>
                  <Text style={styles.score}>{m.score1}</Text>
                </View>

                {/* Team 2 */}
                <View style={[styles.teamRow, m.winnerId === m.team2Id && styles.winnerTeam]}>
                  <Text style={[styles.teamName, m.winnerId === m.team2Id && styles.winnerText]}>
                    {m.team2Name || 'Chờ xác định'}
                  </Text>
                  <Text style={styles.score}>{m.score2}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Register Team Modal */}
      {showRegModal && (
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Đăng Ký Đội Thi Đấu</Text>
          <Text style={styles.modalSub}>{selectedTournament?.name}</Text>

          <Text style={styles.label}>Tên đội thi đấu:</Text>
          <TextInput
            style={styles.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="Ví dụ: Chiến Binh Phanta"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Tên đội trưởng:</Text>
          <TextInput
            style={styles.input}
            value={captainName}
            onChangeText={setCaptainName}
            placeholder="Họ và tên"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Số điện thoại liên hệ:</Text>
          <TextInput
            style={styles.input}
            value={captainPhone}
            onChangeText={setCaptainPhone}
            placeholder="0912345678"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowRegModal(false)}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegisterTeam}
              disabled={submittingTeam}
            >
              {submittingTeam ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={styles.submitBtnText}>Gửi Đăng Ký</Text>
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
  tournamentScroll: {
    maxHeight: 44,
    marginBottom: 12,
  },
  tournamentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  tournamentChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tournamentChipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  tournamentChipTextActive: {
    color: colors.primaryText,
    fontWeight: 'bold',
  },
  bannerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  bannerSport: {
    fontSize: 13,
    color: colors.volt,
    marginTop: 2,
  },
  bannerPrize: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: colors.volt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  bannerButtonText: {
    color: colors.primaryText,
    fontWeight: 'bold',
    fontSize: 12,
  },
  bracketTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  noMatches: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  noMatchesText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  matchesList: {
    flex: 1,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  matchCode: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  matchStatus: {
    color: colors.textMuted,
    fontSize: 11,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  winnerTeam: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  teamName: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  winnerText: {
    color: colors.volt,
    fontWeight: 'bold',
  },
  score: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalSheet: {
    backgroundColor: colors.surfaceLight,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.volt,
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 13,
    color: colors.volt,
    marginBottom: 12,
  },
  label: {
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelBtnText: {
    color: colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: colors.volt,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitBtnText: {
    color: colors.primaryText,
    fontWeight: 'bold',
  },
});
