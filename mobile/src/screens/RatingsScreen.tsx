// mobile/src/screens/RatingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface RatingCriteria {
  id: string;
  name: string;
  desc: string;
  score: number;
}

export const RatingsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [criteriaList, setCriteriaList] = useState<RatingCriteria[]>([
    { id: 'SURFACE', name: '1. Chất Lượng Mặt Sân', desc: 'Độ nảy bóng, độ êm cỏ nhân tạo hoặc sàn gỗ PVC', score: 5 },
    { id: 'LIGHTING', name: '2. Hệ Thống Ánh Sáng', desc: 'Độ sáng dàn đèn LED ban đêm và độ chống chói', score: 5 },
    { id: 'SERVICE', name: '3. Thái Độ Phục Vụ', desc: 'Nhân viên lễ tân, bảo vệ và hỗ trợ dụng cụ', score: 4 },
    { id: 'CLEANLINESS', name: '4. Vệ Sinh & Tiện Ích', desc: 'Phòng thay đồ, nhà tắm nóng lạnh và khu WC', score: 5 },
  ]);

  const [feedback, setFeedback] = useState<string>('');

  const handleSetScore = (id: string, score: number) => {
    setCriteriaList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, score } : c))
    );
  };

  const handleSubmitRating = () => {
    const avg = (criteriaList.reduce((acc, cur) => acc + cur.score, 0) / criteriaList.length).toFixed(1);
    Alert.alert(
      'Gửi Đánh Giá Thành Công',
      `Điểm trung bình: ${avg}/5.0 sao.\nCảm ơn bạn đã đóng góp ý kiến giúp hoàn thiện chất lượng cụm sân Phanta!`,
      [{ text: 'Đóng', onPress: onBack }]
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
            primary="Đánh Giá 4 Tiêu Chí Chất Lượng"
            secondary="Phản hồi sau trận đấu / Cụm sân Phanta Arena"
            badge="4 TIÊU CHÍ"
            badgeColor="#f59e0b"
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Match Context Card */}
          <View style={styles.matchCard}>
            <TwoLineText
              primary="Sân Bóng Đá Mini F1"
              secondary="Trận đấu lúc 18:00 - 19:30 / Ngày 26/10/2026"
              primaryStyle={{ color: '#fff', fontSize: 15 }}
            />
          </View>

          {/* Criteria Cards */}
          <View style={styles.criteriaContainer}>
            {criteriaList.map((c) => (
              <View key={c.id} style={styles.criteriaCard}>
                <TwoLineText
                  primary={c.name}
                  secondary={c.desc}
                  primaryStyle={{ fontSize: 14 }}
                  secondaryStyle={{ fontSize: 11 }}
                />

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleSetScore(c.id, star)}
                      style={styles.starBtn}
                    >
                      <Text style={[styles.starText, star <= c.score && styles.starActive]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.scoreNumber}>{c.score}/5</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Additional Feedback */}
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Góp ý thêm (Tùy chọn):</Text>
            <TextInput
              style={styles.input}
              placeholder="Chia sẻ thêm cảm nhận về buổi thi đấu của bạn..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={feedback}
              onChangeText={setFeedback}
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRating}>
            <Text style={styles.submitBtnText}>Gửi Đánh Giá 4 Tiêu Chí →</Text>
          </TouchableOpacity>
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
  matchCard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  criteriaContainer: { gap: 12, marginBottom: 16 },
  criteriaCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  starBtn: { padding: 4 },
  starText: { fontSize: 24, color: '#334155' },
  starActive: { color: '#fbbf24' },
  scoreNumber: { fontSize: 14, fontWeight: '800', color: '#fbbf24', marginLeft: 8 },
  inputBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginBottom: 8 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});
