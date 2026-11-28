import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { fonts, radius, spacing, useTheme } from '../theme/colors';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

interface OnboardingSlide {
  id: number;
  imageUri: string;
  title: string;
  subtitle: string;
}

export const OnboardingScreen: React.FC<{ onFinish: () => void }> = ({
  onFinish,
}) => {
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState<number>(0);

  const slides: OnboardingSlide[] = [
    {
      id: 1,
      imageUri:
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80',
      title: 'Đặt sân nhanh, không trùng lịch',
      subtitle:
        'Khóa giữ chỗ 10 phút và tự động giải phóng nếu quá hạn. Thanh toán VietQR PayOS khớp lệnh trong 3 giây.',
    },
    {
      id: 2,
      imageUri:
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80',
      title: 'Vé QR động 60 giây và Face ID',
      subtitle:
        'Mã QR xoay vòng mỗi 60 giây kèm gói vé ngoại tuyến. Cổng xoay Gym nhận diện khuôn mặt mở trong 0.5 giây.',
    },
    {
      id: 3,
      imageUri:
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80',
      title: 'Đa tiện ích thể thao và Esports',
      subtitle:
        '7 cụm sân thi đấu, 2 hồ bơi Olympic và nước ấm 31.5 độ C, phòng Cyber Gaming 100 máy RTX 4090.',
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text
            style={[
              styles.stepIndicator,
              { color: theme.accent, fontFamily: fonts.headingBold },
            ]}
          >
            0{currentStep + 1} / 0{slides.length}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable
              onPress={onFinish}
              style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={[
                  styles.skipText,
                  { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
                ]}
              >
                Bỏ qua
              </Text>
            </Pressable>
            <ThemeToggleButton />
          </View>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.imageCircle,
              {
                borderColor: theme.accent,
                backgroundColor: theme.surfaceElevated,
              },
            ]}
          >
            <Image
              source={{ uri: slide.imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <Text
            style={[
              styles.title,
              { color: theme.textHeading, fontFamily: fonts.headingBold },
            ]}
          >
            {slide.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: fonts.body },
            ]}
          >
            {slide.subtitle}
          </Text>

          <View style={styles.dotsRow}>
            {slides.map((s, idx) => {
              const active = currentStep === idx;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setCurrentStep(idx)}
                  accessibilityLabel={`Bước ${idx + 1}`}
                  style={[
                    styles.dot,
                    {
                      width: active ? 24 : 8,
                      backgroundColor: active ? theme.accent : theme.borderLight,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.nextBtnText,
                { color: theme.onAccent, fontFamily: fonts.bodySemiBold },
              ]}
            >
              {currentStep === slides.length - 1 ? 'Bắt đầu ngay' : 'Tiếp theo'}
            </Text>
            <ArrowRight size={16} strokeWidth={2} color={theme.onAccent} />
          </Pressable>

          <Pressable
            onPress={onFinish}
            style={({ pressed }) => [styles.homeBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text
              style={[
                styles.homeBtnText,
                { color: theme.textSecondary, fontFamily: fonts.bodyMedium },
              ]}
            >
              Bỏ qua và vào trang chủ
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: spacing.xxl,
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 13,
  },
  skipBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    fontSize: 13,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  imageCircle: {
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 2,
    padding: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
  },
  title: {
    fontSize: 21,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    gap: spacing.sm,
  },
  nextBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextBtnText: {
    fontSize: 14,
  },
  homeBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontSize: 13,
  },
});
