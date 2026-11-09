// mobile/src/screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { TwoLineText } from '../components/TwoLineText';

interface OnboardingSlide {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  highlight: string;
}

export const OnboardingScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const slides: OnboardingSlide[] = [
    {
      id: 1,
      icon: '⚡',
      title: 'Đặt Sân Siêu Tốc 30 Giây',
      subtitle: 'Ma trận lịch thi đấu thông minh. Khóa giữ chỗ 10 phút chống trùng lặp tuyệt đối.',
      highlight: 'KHÓA CHỖ 10 PHÚT',
    },
    {
      id: 2,
      icon: '🎟️',
      title: 'Vé QR Động Apple Wallet',
      subtitle: 'Mã QR tự động làm mới mỗi 60 giây. Quét mở cửa xoay Turnstile vào sân chưa đầy 1 giây.',
      highlight: 'QR ĐỘNG 60S',
    },
    {
      id: 3,
      icon: '🏆',
      title: 'Hệ Sinh Thái Thể Thao Đỉnh Cao',
      subtitle: '7 Cụm sân hiện đại, Thẻ Gym Face ID, 2 Hồ bơi Olympic và 100 dàn máy Cyber Gaming RTX 4090.',
      highlight: 'TỔ HỢP 7 MÔN',
    },
  ];

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const slide = slides[currentStep];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Skip button */}
        <View style={styles.topBar}>
          <Text style={styles.stepIndicator}>Bước {currentStep + 1} / {slides.length}</Text>
          <TouchableOpacity onPress={onFinish}>
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>

        {/* Content Box */}
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>{slide.icon}</Text>
          </View>

          <View style={styles.highlightBadge}>
            <Text style={styles.highlightText}>{slide.highlight}</Text>
          </View>

          <TwoLineText
            primary={slide.title}
            secondary={slide.subtitle}
            align="center"
            primaryStyle={{ fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 }}
            secondaryStyle={{ fontSize: 14, color: '#94a3b8', lineHeight: 22, textAlign: 'center' }}
          />

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {slides.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.dot,
                  currentStep === idx ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Bottom Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentStep === slides.length - 1 ? 'Bắt Đầu Trải Nghiệm Ngay →' : 'Tiếp Theo →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepIndicator: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  skipText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  content: { alignItems: 'center', marginVertical: 'auto' },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconEmoji: { fontSize: 44 },
  highlightBadge: {
    backgroundColor: '#78350f30',
    borderWidth: 1,
    borderColor: '#f59e0b50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  highlightText: { fontSize: 11, fontWeight: '900', color: '#fbbf24', letterSpacing: 0.5 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 30 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  dotInactive: { width: 8, backgroundColor: '#334155' },
  bottomBar: { marginBottom: 12 },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
});
